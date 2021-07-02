"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("./types");
exports.PROVIDER_ID = 'service-container';
/**
 * Keeps track of an individual service's dependencies. Await `ServiceTracker.promise` to
 * get notified of start (returns the service id).
 */
class ServiceTracker {
    constructor(id) {
        this.depServices = {};
        this.depInterfaces = {};
        this.resolve = (v) => {
        };
        this.reject = (v) => {
        };
        this.id = id;
        this.promise = new Promise((res, rej) => {
            this.resolve = res;
            this.reject = rej;
        });
    }
    isSatisfied() {
        return Object.keys(this.depServices).length == 0 && Object.keys(this.depInterfaces).length == 0;
    }
}
exports.ServiceTracker = ServiceTracker;
exports.canActivateService = (status) => status < types_1.ServiceState.activating || status > types_1.ServiceState.deactivating;
exports.canDeactivateService = (status) => status == types_1.ServiceState.activated;
/**
 * Manages dependency tracking for entire container.
 */
class DependencyTracker {
    constructor() {
        /**
         * key: the serviceId required; value: a map of serviceIds waiting
         */
        this.waitingOnService = {};
        /**
         * key: the interface required; value: a map of serviceIds -> DependencyMeta
         */
        this.waitingOnInterface = {};
        this.interfaceCount = {};
        this.serviceMap = {};
        this.serviceTrackers = {};
    }
    getTracker(id) {
        if (!this.serviceTrackers[id]) {
            this.serviceTrackers[id] = new ServiceTracker(id);
        }
        return this.serviceTrackers[id];
    }
    waitOnService(dependencyId, dependentId) {
        if (!this.waitingOnService[dependencyId]) {
            this.waitingOnService[dependencyId] = {};
        }
        this.waitingOnService[dependencyId][dependentId] = 1;
        this.getTracker(dependentId).depServices[dependencyId] = true;
    }
    waitOnInterface(interfaze, waitingId, depMeta) {
        if (!this.waitingOnInterface[interfaze]) {
            this.waitingOnInterface[interfaze] = {};
        }
        this.waitingOnInterface[interfaze][waitingId] = depMeta;
        this.getTracker(waitingId).depInterfaces[interfaze] = true;
    }
    serviceAvailable(id) {
        if (!this.waitingOnService[id]) {
            return [];
        }
        this.serviceMap[id] = 1;
        const notify = Object.keys(this.waitingOnService[id]);
        delete this.waitingOnService[id];
        for (const sid of notify) {
            delete this.serviceTrackers[sid].depServices[id];
        }
        return notify;
    }
    interfaceAvailable(interfaze) {
        var _a, _b;
        if (!this.waitingOnInterface[interfaze]) {
            return [];
        }
        if (!this.interfaceCount[interfaze]) {
            this.interfaceCount[interfaze] = 0;
        }
        this.interfaceCount[interfaze]++;
        const notify = [];
        for (const waitId of Object.keys(this.waitingOnInterface[interfaze])) {
            const depMeta = this.waitingOnInterface[interfaze][waitId];
            const min = (_b = (_a = depMeta.matchCriteria) === null || _a === void 0 ? void 0 : _a.min) !== null && _b !== void 0 ? _b : 1;
            if (this.interfaceCount[interfaze] >= min) {
                delete this.waitingOnInterface[interfaze][waitId];
                delete this.serviceTrackers[waitId].depInterfaces[interfaze];
                notify.push(waitId);
            }
        }
        return notify;
    }
    bindToInterface(interfaze, dependentId, depMeta) {
        var _a, _b;
        const min = ((_a = depMeta.matchCriteria) === null || _a === void 0 ? void 0 : _a.min) === undefined ? 1 : depMeta.matchCriteria.min;
        if (((_b = this.interfaceCount[interfaze]) !== null && _b !== void 0 ? _b : 0) < min) {
            this.waitOnInterface(interfaze, dependentId, depMeta);
        }
    }
    bindToService(dependencyId, dependentId) {
        if (!this.serviceMap[dependencyId]) {
            this.waitOnService(dependencyId, dependentId);
        }
    }
}
exports.DependencyTracker = DependencyTracker;
class ServiceContainer {
    constructor(initialRecords = []) {
        this.records = {};
        this.instances = {};
        this.recordsById = {};
        this.recordsByGid = {};
        this.interfaceToRec = {};
        this.started = false;
        this.depTracker = new DependencyTracker();
        initialRecords.forEach(r => this.register(r));
    }
    /**
     * For bootstrapping purposes, you can directly add an instance to the container.
     * @return True if id doesn't exist, false otherwise
     */
    // registerDirect(id: string, serviceInst: any): boolean {
    //     if (this.instances[id]) {
    //         return false;
    //     }
    //
    //     // @todo on deactivate, if gid is blank, ignore
    //     const pos = this.records.push({
    //         id,
    //         activator: "",
    //         clazz: undefined,
    //         deactivator: "",
    //         dependencies: [],
    //         factory: "",
    //         gid: "",
    //         injectableFactory: [],
    //         injectableMethods: {},
    //         interfaces: [],
    //         priority: 0,
    //         status: ServiceState.activated
    //     })
    //     this.recordsById[id] = pos;
    //     this.instances[id] = serviceInst;
    //
    //     return true;
    // }
    has(id) {
        return this.instances[id] !== undefined;
    }
    hasGid(gid) {
        var _a;
        return this.has((_a = this.records[this.recordsByGid[gid]]) === null || _a === void 0 ? void 0 : _a.id);
    }
    resolve(id) {
        if (!this.has(id)) {
            throw new Error(`${id}: service not found`); // @todo specific error
        }
        return this.instances[id];
    }
    resolveGid(gid) {
        const id = this.recordsByGid[gid];
        return this.resolve(id);
    }
    /**
     * Returns instances matching interface in high-to-low priority order.
     */
    query(matchInterface) {
        if (!this.interfaceToRec[matchInterface]) {
            return [];
        }
        const services = [];
        this.interfaceToRec[matchInterface]
            .forEach(idx => {
            const rec = this.records[idx];
            const id = rec.id;
            if (this.has(id)) {
                services.push([rec.priority, this.resolve(id)]);
            }
        });
        return services.sort(([p1], [p2]) => {
            if (p1 < p2)
                return 1;
            else if (p1 > p2)
                return -1;
            return 0;
        }).map(([p, inst]) => inst);
    }
    register(metadata) {
        if (this.recordsById[metadata.id]) {
            return;
        }
        this.records[metadata.id] = metadata;
        this.recordsByGid[metadata.gid] = metadata.id;
        metadata.interfaces.forEach(int => {
            if (!this.interfaceToRec[int]) {
                this.interfaceToRec[int] = [];
            }
            this.interfaceToRec[int].push(metadata.id);
        });
        if (this.started) {
            // @todo immediate start
        }
    }
    async startup() {
        if (this.started) {
            return this;
        }
        const recs = Object.values(this.records).sort(({ priority: p1 }, { priority: p2 }) => {
            return p1 < p2 ? 1 : p1 > p2 ? -1 : 0;
        });
        const promises = [];
        for (const rec of recs) {
            if (rec.disabled || !exports.canActivateService(rec.status)) {
                continue;
            }
            promises.push(this.initServiceFromRecord(rec).then(inst => {
                rec.status = types_1.ServiceState.activated;
                console.log(`service-container: ${rec.id}`);
                const notifyServices = this.depTracker.serviceAvailable(rec.id);
                const interfaces = [];
                const notifyInterfaces = rec.interfaces
                    .map(int => {
                    interfaces.push(int);
                    return this.depTracker.interfaceAvailable(int);
                }).reduce((a, b) => a.concat(b), []);
                this.wakeUpDependents(notifyServices.concat(notifyInterfaces));
                // @todo notify subscribers for interfaces
            }));
        }
        // @todo need audit trail of service start/stop
        // @todo need dashboard data for all services
        this.started = true;
        await Promise.all(promises);
        return this;
    }
    async initServiceFromRecord(rec) {
        const tracker = this.depTracker.getTracker(rec.id);
        return this.waitOnDependencies(rec, tracker).then(async (serviceId) => {
            const inst = this.makeInstance(rec);
            this.instances[rec.id] = inst;
            this.processInjections(rec, inst);
            return this.activateService(rec, inst).then(() => inst);
        });
    }
    async waitOnDependencies(rec, tracker) {
        for (const dep of Object.keys(rec.dependencies)) {
            if (dep.startsWith('#')) {
                const interfaze = dep.substring(1);
                const matchCriteria = rec.dependencies[dep];
                this.depTracker.bindToInterface(interfaze, rec.id, { matchCriteria });
            }
            else {
                this.depTracker.bindToService(dep, rec.id);
            }
        }
        const st = this.depTracker.getTracker(rec.id);
        if (st.isSatisfied()) {
            st.resolve(rec.id);
        }
        return st.promise;
    }
    wakeUpDependents(depIds) {
        const visited = {};
        for (const depId of depIds) {
            if (visited[depId])
                continue;
            visited[depId] = true;
            const st = this.depTracker.getTracker(depId);
            if (st.isSatisfied()) {
                st.resolve(depId);
            }
        }
    }
    async shutdown() {
        if (!this.started) {
            throw new Error('serviceContainer not started');
        }
        const promises = [];
        for (const rec of Object.values(this.records)) {
            if (rec.disabled || exports.canDeactivateService(rec.status)) {
                continue;
            }
            ;
            promises.push(this.deactivateService(rec, this.instances[rec.id]).catch(e => {
                console.error(`failed to successfully deactivate: ${rec.id}`, e);
            }).finally(() => {
                delete this.instances[rec.id];
                rec.status = types_1.ServiceState.deactivated;
            }));
        }
        this.started = false;
        return this;
    }
    makeInstance(rec) {
        const clazz = rec.clazz;
        const config = rec.injectConfig ? this.resolve(rec.injectConfig) : undefined;
        if (rec.factory) {
            if (config) {
                return clazz[rec.factory](config, ...this.getDependenciesAsArgs(rec.injectableFactory));
            }
            else {
                return clazz[rec.factory](...this.getDependenciesAsArgs(rec.injectableFactory));
            }
        }
        else if (config) {
            return new clazz(config);
        }
        else {
            return new clazz();
        }
    }
    processInjections(rec, inst) {
        for (const methodName of Object.keys(rec.injectableMethods)) {
            inst[methodName](...this.getDependenciesAsArgs(rec.injectableMethods[methodName]));
        }
    }
    getDependenciesAsArgs(injectable) {
        const args = injectable.map((dep) => {
            if (!dep) {
                return;
            }
            else if (dep.id) {
                return this.resolve(dep.id);
            }
            else if (dep.matchInterface) {
                const svcs = this.query(dep.matchInterface);
                return svcs;
            }
        });
        return args;
    }
    async activateService(rec, inst) {
        if (rec.activator) {
            return Promise.resolve(inst[rec.activator]());
        }
    }
    async deactivateService(rec, inst) {
        // @todo deactivate dependents of rec.id
        if (rec.deactivator) {
            return Promise.resolve(inst[rec.deactivator]());
        }
    }
}
exports.ServiceContainer = ServiceContainer;
//# sourceMappingURL=index.js.map