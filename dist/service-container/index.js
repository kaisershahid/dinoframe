"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("./types");
const logging_1 = require("./common/logging");
exports.PROVIDER_ID = "service-container";
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
    isResolved() {
        return (Object.keys(this.depServices).length == 0 &&
            Object.keys(this.depInterfaces).length == 0);
    }
}
exports.ServiceTracker = ServiceTracker;
exports.canActivateService = (status) => status < types_1.ServiceState.activating || status > types_1.ServiceState.deactivating;
exports.canDeactivateService = (status) => status == types_1.ServiceState.activated;
const lf = logging_1.LoggerFactory.getSingleton();
const logger = lf.getLogger("service-container");
const dtLogger = lf.getLogger("service-container.deptrack");
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
        // @todo figure out why this is happening!
        if (!this.waitingOnService[dependencyId]) {
            this.waitingOnService[dependencyId] = {};
        }
        this.waitingOnService[dependencyId][dependentId] = 1;
        this.getTracker(dependentId).depServices[dependencyId] = true;
        dtLogger.debug(`waitOnService: ${dependentId} -> ${dependencyId}`);
    }
    waitOnInterface(interfaze, waitingId, depMeta) {
        var _a;
        // if 0 is required, don't wait (service will need to use framework listeners)
        if (((_a = depMeta.matchCriteria) === null || _a === void 0 ? void 0 : _a.min) === 0) {
            return;
        }
        if (!this.waitingOnInterface[interfaze]) {
            this.waitingOnInterface[interfaze] = {};
        }
        this.waitingOnInterface[interfaze][waitingId] = depMeta;
        this.getTracker(waitingId).depInterfaces[interfaze] = true;
        dtLogger.debug(`waitOnInterface: ${waitingId} -> ${interfaze}`);
    }
    serviceAvailable(id) {
        this.serviceMap[id] = 1;
        if (!this.waitingOnService[id]) {
            dtLogger.debug(`serviceAvailable: ${id} -> NO_WAITING_DEPS`);
            return [];
        }
        const notify = Object.keys(this.waitingOnService[id]);
        dtLogger.debug(`serviceAvailable: ${id} ->`, notify);
        delete this.waitingOnService[id];
        for (const sid of notify) {
            delete this.serviceTrackers[sid].depServices[id];
        }
        return notify;
    }
    interfaceAvailable(interfaze) {
        var _a, _b;
        if (!this.waitingOnInterface[interfaze]) {
            dtLogger.debug(`interfaceAvailable: ${interfaze} -> NO_WAITING_DEPS`);
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
            console.log(`## ${interfaze}: ${waitId} -> ${min}`);
            if (this.interfaceCount[interfaze] >= min) {
                delete this.waitingOnInterface[interfaze][waitId];
                delete this.serviceTrackers[waitId].depInterfaces[interfaze];
                notify.push(waitId);
            }
        }
        dtLogger.debug(`serviceAvailable: ${interfaze} ->`, notify);
        return notify;
    }
    bindToInterface(interfaze, dependentId, depMeta) {
        var _a, _b;
        const min = ((_a = depMeta.matchCriteria) === null || _a === void 0 ? void 0 : _a.min) === undefined ? 1 : depMeta.matchCriteria.min;
        if (((_b = this.interfaceCount[interfaze]) !== null && _b !== void 0 ? _b : 0) < min) {
            this.waitOnInterface(interfaze, dependentId, depMeta);
        }
        else {
            dtLogger.debug(`bindToInterface: ${dependentId} -> ${interfaze}`);
        }
    }
    bindToService(dependencyId, dependentId) {
        if (!this.serviceMap[dependencyId]) {
            const [subId, factoryId] = dependencyId.split("@");
            this.waitOnService(factoryId !== null && factoryId !== void 0 ? factoryId : dependencyId, dependentId);
        }
        else {
            dtLogger.debug(`bindToService: ${dependentId} -> ${dependencyId}`);
        }
    }
}
exports.DependencyTracker = DependencyTracker;
class ServiceFactoryHelper {
    constructor(container) {
        this.container = container;
    }
    has(id) {
        console.log("?> ", id);
        const [subId, factoryId] = id.split("@");
        this.assertIsFactory(factoryId);
        if (!this.container.has(factoryId)) {
            return false;
        }
        return this.container.resolve(factoryId).has(subId);
    }
    resolve(id) {
        console.log("?? ", id);
        const [subId, factoryId] = id.split("@");
        this.assertIsFactory(factoryId);
        const svc = this.container
            .resolve(factoryId)
            .resolve(subId);
        if (!svc) {
            throw new Error(`${id}: service not found`);
        }
        return svc;
    }
    assertIsFactory(id) {
        if (!this.container.isFactory(id)) {
            throw new Error(`${id}: not a factory`);
        }
    }
}
exports.ServiceFactoryHelper = ServiceFactoryHelper;
class ServiceContainer {
    constructor(initialRecords = []) {
        this.records = {};
        this.instances = {};
        this.recordsById = {};
        this.recordsByGid = {};
        this.interfaceToRec = {};
        this.started = false;
        this.depTracker = new DependencyTracker();
        this.interfaceSubscribers = {};
        initialRecords.forEach((r) => this.register(r));
        this.factoryHelper = new ServiceFactoryHelper(this);
        this.logger = logger;
    }
    has(id) {
        if (id.includes("@")) {
            return this.factoryHelper.has(id);
        }
        return this.instances[id] !== undefined;
    }
    hasGid(gid) {
        var _a;
        return this.has((_a = this.records[this.recordsByGid[gid]]) === null || _a === void 0 ? void 0 : _a.id);
    }
    resolve(id) {
        if (id.includes("@")) {
            return this.factoryHelper.resolve(id);
        }
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
        this.interfaceToRec[matchInterface].forEach((idx) => {
            const rec = this.records[idx];
            const id = rec.id;
            if (this.has(id)) {
                services.push([rec.priority, this.resolve(id)]);
            }
        });
        return services
            .sort(([p1], [p2]) => {
            if (p1 < p2)
                return 1;
            else if (p1 > p2)
                return -1;
            return 0;
        })
            .map(([p, inst]) => inst);
    }
    register(metadata) {
        if (this.recordsById[metadata.id]) {
            return;
        }
        this.records[metadata.id] = metadata;
        this.recordsByGid[metadata.gid] = metadata.id;
        metadata.interfaces.forEach((int) => {
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
            if (rec.isDisabled || !exports.canActivateService(rec.status)) {
                continue;
            }
            promises.push(this.initServiceFromRecord(rec).then((inst) => {
                rec.status = types_1.ServiceState.activated;
                this.logger.info(`! startup: ${rec.id} AVAILABLE`);
                const notifyServices = this.depTracker.serviceAvailable(rec.id);
                const interfaces = [];
                const notifyInterfaces = rec.interfaces
                    .map((int) => {
                    interfaces.push(int);
                    return this.depTracker.interfaceAvailable(int);
                })
                    .reduce((a, b) => a.concat(b), []);
                this.registerInterfaceSubscriptions(rec.id, inst, rec.subscribeToInterfaces);
                this.wakeUpDependents(notifyServices.concat(notifyInterfaces));
                console.log('🥁 ', rec.id, rec.interfaces);
                this.notifyInterfacesAvailable(inst, notifyInterfaces);
            }).catch((e) => {
                this.logger.error(e);
            }));
        }
        // @todo need audit trail of service start/stop
        // @todo need dashboard data for all services
        this.started = true;
        await Promise.all(promises).catch((e) => {
            this.logger.error(`startup failed`, e);
        });
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
        const deps = Object.keys(rec.dependencies);
        this.logger.info(`waitOnDependencies: ${rec.id} ->`, deps.length > 1 ? deps : 'NO_DEPS');
        for (const dep of deps) {
            if (dep.startsWith("#")) {
                const interfaze = dep.substring(1);
                const matchCriteria = rec.dependencies[dep];
                this.depTracker.bindToInterface(interfaze, rec.id, { matchCriteria });
            }
            else {
                // unlike a normal service ref, a factory service ref should only depend on the root factory
                // and not a specific sub-service -- this is because sub-services have unknown cardinality.
                // we could work in extra checks to force creation of required sub-services once factory is
                // available, but for now using this approach
                const [subId, factoryId] = dep.split("@");
                this.depTracker.bindToService(factoryId ? factoryId : dep, rec.id);
            }
        }
        const st = this.depTracker.getTracker(rec.id);
        if (st.isResolved()) {
            st.resolve(rec.id);
        }
        return st.promise;
    }
    registerInterfaceSubscriptions(svcId, inst, interfaces) {
        for (const _interface of interfaces) {
            if (!this.interfaceSubscribers[_interface]) {
                this.interfaceSubscribers[_interface] = {};
            }
            this.interfaceSubscribers[_interface][svcId] = inst;
        }
    }
    wakeUpDependents(depIds) {
        const visited = {};
        for (const depId of depIds) {
            if (visited[depId])
                continue;
            visited[depId] = true;
            const st = this.depTracker.getTracker(depId);
            if (st.isResolved()) {
                this.logger.info(`. wakeUpDependents: ${depId} RESOLVED`);
                st.resolve(depId);
            }
        }
    }
    notifyInterfacesAvailable(inst, notifyInterfaces) {
        for (const _interface of notifyInterfaces) {
            if (!this.interfaceSubscribers[_interface]) {
                continue;
            }
            for (const svcId in this.interfaceSubscribers[_interface]) {
                console.log('<<<', svcId, _interface);
                try {
                    this.interfaceSubscribers[_interface][svcId].onAvailableInterface(_interface, [inst]);
                }
                catch (e) {
                    this.logger.error(`notifyInterfacesAvailable: ${_interface} -> ${svcId}`, e);
                }
            }
        }
    }
    async shutdown() {
        if (!this.started) {
            throw new Error("serviceContainer not started");
        }
        const promises = [];
        for (const rec of Object.values(this.records)) {
            if (rec.isDisabled || exports.canDeactivateService(rec.status)) {
                continue;
            }
            promises.push(this.deactivateService(rec, this.instances[rec.id])
                .catch((e) => {
                this.logger.error(`failed to successfully deactivate: ${rec.id}`, e);
            })
                .finally(() => {
                delete this.instances[rec.id];
                rec.status = types_1.ServiceState.deactivated;
            }));
        }
        this.started = false;
        return this;
    }
    makeInstance(rec) {
        const clazz = rec.clazz;
        const config = rec.injectConfig
            ? this.resolve(rec.injectConfig)
            : undefined;
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
    isFactory(factoryId) {
        return !!this.records[factoryId].isFactory;
    }
    /**
     * Does static analysis on current service records to determine what dependencies are missing
     */
    static analyzeDependencies(records) {
        // for each service, report: id, status, dependencies not fulfilled
        const depTrack = new DependencyTracker();
        const recById = {};
        // fifo for serviceIds to check. build up with initial services, then for each set of services
        // to notify, add to queue
        let recIds = Object.values(records).map((rec, idx) => {
            if (rec.id) {
                recById[rec.id] = idx;
            }
            return rec.id;
        }).filter(id => id !== undefined);
        while (recIds.length > 0) {
            const recId = recIds.shift();
            const rec = records[recById[recId]];
            // ensure we have an entry that we can report back on later
            depTrack.getTracker(recId);
            if (rec.isDisabled) {
                continue;
            }
            // check which dependencies are available
            let miss = 0;
            for (const dep of Object.keys(rec.dependencies)) {
                const depMeta = rec.dependencies[dep];
                if ((depMeta === null || depMeta === void 0 ? void 0 : depMeta.min) === 0) {
                    continue;
                }
                let [subId, factoryId] = dep.split('@');
                let depId = factoryId ? factoryId : dep;
                if (!depTrack.serviceMap[depId]) {
                    depTrack.waitOnService(depId, rec.id);
                    miss++;
                }
            }
            // all available -- broadcast
            if (miss == 0) {
                // build list of dependents
                let notify = depTrack.serviceAvailable(rec.id);
                for (const interfaze of rec.interfaces) {
                    notify = notify.concat(depTrack.interfaceAvailable(interfaze));
                }
                // broadcast availability to dependents
                const notified = {};
                for (const dependentId of notify) {
                    if (!notified[dependentId]) {
                        notified[dependentId] = true;
                        const st = depTrack.getTracker(dependentId);
                        // re-process now that it's resolved
                        if (st.isResolved()) {
                            recIds.push(dependentId);
                        }
                    }
                }
            }
        }
        const status = [];
        for (const recId of Object.keys(depTrack.serviceTrackers)) {
            const st = depTrack.serviceTrackers[recId];
            const rec = {
                id: recId,
                status: records[recById[recId]].isDisabled ? 'DISABLED' : (st.isResolved() ? 'RESOLVED' : 'UNRESOLVED'),
                unresolvedDeps: Object.keys(st.depServices).concat(Object.keys(st.depInterfaces).map(i => `#${i}`))
            };
            status.push(rec);
        }
        return status;
    }
}
exports.ServiceContainer = ServiceContainer;
//# sourceMappingURL=index.js.map