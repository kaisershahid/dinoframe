import {asFunction, AwilixContainer, createContainer} from "awilix";
import {
    ClassServiceMetadata,
    DecoratedServiceRecord, DependencyMeta, InjectableList,
    ServiceContainer,
    ServiceRecord,
    ServiceState
} from "./types";

export class ServiceTracker {
    id: string;
    depServices: Record<string,any> = {};
    depInterfaces: Record<string,any> = {};
    promise: Promise<any>;
    resolve: (value?: (PromiseLike<any> | any)) => void = (v) => {};
    reject: (reason?: any) => void = (v) => {};

    constructor(id:string) {
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

export class DependencyTracker {
    /**
     * key: the serviceId required; value: a map of serviceIds waiting
     */
    waitingOnService: Record<string,Record<string,any>> = {};
    /**
     * key: the interface required; value: a map of serviceIds -> DependencyMeta
     */
    waitingOnInterface: Record<string,Record<string,DependencyMeta>> = {};
    interfaceCount: Record<string,number> = {};
    serviceMap: Record<string,any> = {};
    serviceTrackers: Record<string, ServiceTracker> = {}

    getTracker(id: string): ServiceTracker {
        if (!this.serviceTrackers[id]) {
            this.serviceTrackers[id] = new ServiceTracker(id);
        }
        return this.serviceTrackers[id];
    }

    waitOnService(dependencyId: string, dependentId: string) {
        if (!this.waitingOnService[dependencyId]) {
            this.waitingOnService[dependencyId] = {};
        }

        this.waitingOnService[dependencyId][dependentId] = 1;
        this.getTracker(dependentId).depServices[dependencyId] = true;
    }

    waitOnInterface(interfaze: string, waitingId: string, depMeta: DependencyMeta) {
        if (!this.waitingOnInterface[interfaze]) {
            this.waitingOnInterface[interfaze] = {};
        }
        this.waitingOnInterface[interfaze][waitingId] = depMeta;
        this.getTracker(waitingId).depInterfaces[interfaze] = true;
    }

    serviceAvailable(id: string) {
        if (!this.waitingOnService[id]) {
            return [];
        }

        this.serviceMap[id] = 1;
        const notify = Object.keys(this.waitingOnService[id])
        delete this.waitingOnService[id];
        for (const sid of notify) {
            delete this.serviceTrackers[sid].depServices[id];
        }
        return notify;
    }

    interfaceAvailable(interfaze: string) {
        if (!this.waitingOnInterface[interfaze]) {
            return [];
        }

        if (!this.interfaceCount[interfaze]) {
            this.interfaceCount[interfaze] = 0;
        }
        this.interfaceCount[interfaze]++;

        const notify: string[] = [];
        for (const waitId of Object.keys(this.waitingOnInterface[interfaze])) {
            const depMeta = this.waitingOnInterface[interfaze][waitId];
            const min = depMeta.matchCriteria?.min ?? 1;
            if (this.interfaceCount[interfaze] >= min) {
                delete this.waitingOnInterface[interfaze][waitId];
                delete this.serviceTrackers[waitId].depInterfaces[interfaze];
                notify.push(waitId);
            }
        }

        return notify;
    }

    bindToInterface(interfaze: string, dependentId: string, depMeta: DependencyMeta) {
        const min = depMeta.matchCriteria?.min === undefined ? 1 :depMeta.matchCriteria.min
        console.log('?bindToInterface', {interfaze,dependentId,min})
        if ((this.interfaceCount[interfaze]??0) < min) {
            console.log('--> waiting')
            this.waitOnInterface(interfaze, dependentId, depMeta);
        }
    }

    bindToService(dependencyId: string, dependentId: string) {
        if (!this.serviceMap[dependencyId]) {
            this.waitOnService(dependencyId, dependentId);
        }
    }
}

export class ServiceContainerWrapper implements ServiceContainer {
    private container: AwilixContainer<any>;
    private records: ServiceRecord[] = [];
    private instances: Record<string, any> = {};
    private recordsById: Record<string, number> = {};
    private recordsByGid: Record<string, number> = {};
    private interfaceToRec: Record<string, number[]> = {};
    private started: boolean = false;
    private depTracker = new DependencyTracker();

    constructor(container?: AwilixContainer) {
        this.container = container ?? createContainer();
    }

    resolve<T extends any = any>(id: string): T {
        return this.container.resolve<T>(id);
    }

    query<T extends any = any>(matchInterface: string): T[] {
        if (!this.interfaceToRec[matchInterface]) {
            return [];
        }
        const services:T[] = []
        this.interfaceToRec[matchInterface]
            .forEach(idx => {
                const id = this.records[idx].id;
                if (this.container.has(id)) {
                    services.push(this.container.resolve(id))
                }
            });
        // @todo support matchCriteria and only return if services satisfies it
        return services;
    }

    register(metadata: DecoratedServiceRecord) {
        if (this.recordsById[metadata.id]) {
            return;
        }

        const pos = this.records.length;
        this.records.push(metadata);
        this.recordsById[metadata.id] = pos;
        this.recordsByGid[metadata.gid] = pos;
        metadata.interfaces.forEach(int => {
            if (!this.interfaceToRec[int]) {
                this.interfaceToRec[int] = [];
            }
            this.interfaceToRec[int].push(pos);
        })

        if (this.started) {
            // @todo immediate start
        }
    }

    async startup(): Promise<ServiceContainer> {
        if (this.started) {
            return this;
        }

        const recs = this.records.sort(({priority: p1}, {priority: p2}) => {
            return p1 < p2 ? 1 : p1 > p2 ? -1 : 0;
        });

        const promises: Promise<any>[] = [];
        for (const rec of recs) {
            console.log('starting init', rec.id, rec);
            promises.push(this.initServiceFromRecord(rec).then(inst => {
                rec.status = ServiceState.activated;
                console.log(`activated: ${rec.id}`)
                this.container.register(rec.id, asFunction(() => inst).disposer(() => {
                    // @todo invoke shutdown on service
                }));

                const notifyServices = this.depTracker.serviceAvailable(rec.id);
                const interfaces: string[] = [];
                const notifyInterfaces = rec.interfaces
                    .map(int => {
                        interfaces.push(int);
                        return this.depTracker.interfaceAvailable(int);
                    }).reduce((a, b) => a.concat(b), []);

                this.wakeUpDependents(notifyServices.concat(notifyInterfaces));
                // @todo notify subscribers for interfaces

                console.log(`>> service activated: ${rec.id}`)
                // @todo wake up dependents
            }))
        }

        this.started = true;
        await Promise.all(promises);
        return this;
    }

    protected async initServiceFromRecord(rec: ServiceRecord): Promise<any> {
        const tracker = this.depTracker.getTracker(rec.id);
        return this.waitOnDependencies(rec, tracker).then(async (serviceId) => {
            const inst = this.makeInstance(rec);
            this.instances[rec.id] = inst;
            this.processInjections(rec, inst);
            return this.activateService(rec, inst).then(() => inst);
        });
    }

    private async waitOnDependencies(rec: ServiceRecord, tracker: ServiceTracker) {
        for (const dep of Object.keys(rec.dependencies)) {
            if (dep.startsWith('#')) {
                const interfaze = dep.substring(1);
                const matchCriteria = rec.dependencies[dep];
                this.depTracker.bindToInterface(interfaze, rec.id, {matchCriteria});
            } else {
                this.depTracker.bindToService(dep, rec.id);
            }
        }

        const st = this.depTracker.getTracker(rec.id);
        if (st.isSatisfied()) {
            console.log('! satisfied:', rec.id);
            st.resolve(rec.id);
        }

        return st.promise;
    }

    private wakeUpDependents(depIds: string[]) {
        const visited: Record<string,boolean> = {};
        for (const depId of depIds) {
            if (visited[depId]) continue;
            visited[depId] = true;
            const st = this.depTracker.getTracker(depId);
            if (st.isSatisfied()) {
                console.log(`@ satisfied: ${depId}`)
                st.resolve(depId);
            }
        }
    }

    shutdown(): Promise<ServiceContainer> {
        throw new Error()
    }

    protected makeInstance(rec: ServiceRecord): any {
        const clazz = rec.clazz;
        if (rec.factory) {
            return clazz[rec.factory](...this.getDependenciesAsArgs(rec.injectableFactory));
        }

        return new clazz();
    }

    protected processInjections(rec: ServiceRecord, inst: any) {
        for (const methodName of Object.keys(rec.injectableMethods)) {
            inst[methodName](...this.getDependenciesAsArgs(rec.injectableMethods[methodName]));
        }
    }

    getDependenciesAsArgs(injectable: InjectableList): any[] {
        const args = injectable.map((dep) => {
            if (!dep) {
                return;
            } else if (dep.id) {
                return this.container.resolve(dep.id);
            } else if (dep.matchInterface) {
                const svcs = this.query(dep.matchInterface);
                return svcs;
            }
        });
        return args;
    }

    protected async activateService(rec: ServiceRecord, inst: any) {
        if (rec.activator) {
            return Promise.resolve(inst[rec.activator])
        }
    }
}
