import { DecoratedClass } from '../decorator';
import { DecoratedServiceRecord } from './utils';
/**
 * These are the standard priorities used to organize startup. Note that priorities don't absolutely
 * guarantee starting before lower priorities -- if a higher priority service has to wait on a lower
 * level service, this would never be satisfied. Treat highest priority services as:
 *
 * - those having no dependencies (or dependences that are likely high priority) AND
 * - are a base dependency for large branches of the service tree
 */
export declare enum ContainerPhases {
    /** The most vital services necessary to connect the next layer */
    bootstrap = 10000,
    /** Critical db and other data provider initialization */
    datalink = 90000,
    /** Config handlers necessary to provide configs for lower priority services */
    config = 80000,
    usercritical = 10000,
    default = 0,
    userlow = -10000
}
export type BaseServiceMeta = {
    interfaces?: string[];
    disabled?: boolean;
    /** Default 0. Higher number means earlier start. Load order on tie. */
    priority?: number;
    /**
     * If set and true, derives config id as `config/${serviceId}`. If string, uses string value as
     * config id. The config service then becomes a dependency and will be injected either as the
     * first parameter in the constructor OR the first parameter in @Factory method.
     */
    injectConfig?: boolean | string;
    /**
     * If defined, automatically generates a config meta-service with an id based on injectConfig.
     * Good for defaults. Auto-generated configs are set at default priority.
     * @todo implement
     */
    config?: Record<string, any>;
    isFactory?: boolean;
    subscribeToInterfaces?: string[];
};
export type ServiceMeta = BaseServiceMeta & {
    id: string;
    gid: string;
};
export declare enum ServiceState {
    registered = 0,
    activating = 11,
    activated = 20,
    deactivating = 21,
    deactivated = 30
}
export type InjectableList = (DependencyMeta | undefined)[];
export interface InterfaceAvailableListener {
    onAvailableInterface(_interface: string, services: any[]): void;
}
export type ServiceRecord = {
    provider: string;
    id: string;
    gid: string;
    isDisabled?: boolean;
    priority: number;
    interfaces: string[];
    clazz: any;
    isFactory?: boolean;
    injectConfig?: string;
    config?: Record<string, any>;
    status: ServiceState;
    factory: string;
    injectableFactory: InjectableList;
    activator: string;
    deactivator: string;
    dependencies: Record<string, any>;
    injectableMethods: Record<string, InjectableList>;
    subscribeToInterfaces: string[];
};
export declare enum MethodType {
    activate = 1,
    deactivate = 2,
    factory = 3,
    injectable = 4
}
export type MethodInvoker = {
    type: MethodType;
    name: string;
};
export type DependencyMeta = {
    /** Id of dependency. Takes precedence over interfaces */
    id?: string;
    /** match 1+ */
    matchInterface?: string;
    /**
     * If specified, provides more specific constraints on matches (e.g. need minimum
     * of 5 matching services). Defaults to `{min:1}`
     */
    matchCriteria?: {
        min?: number;
    };
};
export type ClassServiceMetadata = DecoratedClass<ServiceMeta, MethodInvoker, DependencyMeta>;
export interface Container {
    /** Checks if a service has been registered. */
    has(id: string): boolean;
    /** Retrieve a service by id. Throws error if not found. */
    resolve<T extends any = any>(id: string): T;
    /** Retrieve many services conforming to query. */
    query<T extends any = any>(matchInterface: string): T[];
    /**
     * Initializes services and resolves dependencies. Expectation is that all non-disabled
     * services must start before promise is resolved. Future improvements will allow for return
     * on partial start. */
    startup(): Promise<Container>;
    /**
     * Stops all services. Expectation is that dependents on a service will be recursively shutdown
     * before a specific service is shutdown, and that any shutdown errors will only be logged but
     * not prevent shutdown.
     */
    shutdown(): Promise<Container>;
    /**
     * Advertise a service record to container for [immediate] startup.
     */
    register(metadata: DecoratedServiceRecord): this;
}
/**
 * A partial container interface implemented by @ServiceFactory instances.
 */
export interface FactoryContainer extends Pick<Container, 'has' | 'resolve'> {
}
