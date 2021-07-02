import { DecoratedServiceRecord, DependencyMeta, InjectableList, Container, ServiceRecord, ServiceState } from "./types";
export declare const PROVIDER_ID = "service-container";
/**
 * Keeps track of an individual service's dependencies. Await `ServiceTracker.promise` to
 * get notified of start (returns the service id).
 */
export declare class ServiceTracker {
    id: string;
    depServices: Record<string, any>;
    depInterfaces: Record<string, any>;
    promise: Promise<string>;
    resolve: (value?: (PromiseLike<any> | any)) => void;
    reject: (reason?: any) => void;
    constructor(id: string);
    isSatisfied(): boolean;
}
export declare const canActivateService: (status: ServiceState) => boolean;
export declare const canDeactivateService: (status: ServiceState) => boolean;
/**
 * Manages dependency tracking for entire container.
 */
export declare class DependencyTracker {
    /**
     * key: the serviceId required; value: a map of serviceIds waiting
     */
    waitingOnService: Record<string, Record<string, any>>;
    /**
     * key: the interface required; value: a map of serviceIds -> DependencyMeta
     */
    waitingOnInterface: Record<string, Record<string, DependencyMeta>>;
    interfaceCount: Record<string, number>;
    serviceMap: Record<string, any>;
    serviceTrackers: Record<string, ServiceTracker>;
    getTracker(id: string): ServiceTracker;
    waitOnService(dependencyId: string, dependentId: string): void;
    waitOnInterface(interfaze: string, waitingId: string, depMeta: DependencyMeta): void;
    serviceAvailable(id: string): string[];
    interfaceAvailable(interfaze: string): string[];
    bindToInterface(interfaze: string, dependentId: string, depMeta: DependencyMeta): void;
    bindToService(dependencyId: string, dependentId: string): void;
}
export declare class ServiceContainer implements Container {
    records: Record<string, ServiceRecord>;
    private instances;
    recordsById: Record<string, number>;
    recordsByGid: Record<string, string>;
    private interfaceToRec;
    private started;
    private depTracker;
    constructor(initialRecords?: DecoratedServiceRecord[]);
    /**
     * For bootstrapping purposes, you can directly add an instance to the container.
     * @return True if id doesn't exist, false otherwise
     */
    has(id: string): boolean;
    hasGid(gid: string): boolean;
    resolve<T extends any = any>(id: string): T;
    resolveGid<T extends any = any>(gid: string): T;
    /**
     * Returns instances matching interface in high-to-low priority order.
     */
    query<T extends any = any>(matchInterface: string): T[];
    register(metadata: DecoratedServiceRecord): void;
    startup(): Promise<Container>;
    protected initServiceFromRecord(rec: ServiceRecord): Promise<any>;
    private waitOnDependencies;
    private wakeUpDependents;
    shutdown(): Promise<Container>;
    protected makeInstance(rec: ServiceRecord): any;
    protected processInjections(rec: ServiceRecord, inst: any): void;
    getDependenciesAsArgs(injectable: InjectableList): any[];
    protected activateService(rec: ServiceRecord, inst: any): Promise<any>;
    protected deactivateService(rec: ServiceRecord, inst: any): Promise<any>;
}
