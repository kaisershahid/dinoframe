import { DependencyMeta, InjectableList, Container, ServiceRecord, ServiceState, FactoryContainer } from "./types";
import { DecoratedServiceRecord } from "./utils";
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
    resolve: (value?: PromiseLike<any> | any) => void;
    reject: (reason?: any) => void;
    constructor(id: string);
    isResolved(): boolean;
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
export declare class ServiceFactoryHelper implements FactoryContainer {
    private container;
    constructor(container: ServiceContainer);
    has(id: string): boolean;
    resolve<T>(id: string): T;
    private assertIsFactory;
}
export declare class ServiceContainer implements Container {
    private records;
    private instances;
    private recordsById;
    private recordsByGid;
    private interfaceToRec;
    private started;
    private depTracker;
    private factoryHelper;
    private logger;
    private interfaceSubscribers;
    constructor(initialRecords?: DecoratedServiceRecord[]);
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
    private registerInterfaceSubscriptions;
    private wakeUpDependents;
    private notifyInterfacesAvailable;
    shutdown(): Promise<Container>;
    protected makeInstance(rec: ServiceRecord): any;
    protected processInjections(rec: ServiceRecord, inst: any): void;
    getDependenciesAsArgs(injectable: InjectableList): any[];
    protected activateService(rec: ServiceRecord, inst: any): Promise<any>;
    protected deactivateService(rec: ServiceRecord, inst: any): Promise<any>;
    isFactory(factoryId: string): boolean;
    /**
     * Does static analysis on current service records to determine what dependencies are missing
     */
    static analyzeDependencies(records: DecoratedServiceRecord[]): {
        id: string;
        status: string;
        unresolvedDeps: string[];
    }[];
}
