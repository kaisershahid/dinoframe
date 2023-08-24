import { ClassServiceMetadata, DependencyMeta, InjectableList, MethodInvoker, ServiceMeta, ServiceRecord, ServiceState } from "./types";
import { DecoratedClass, DecoratedClassBuilder } from "../decorator";
/**
 * Normalizes DecoratedClass metadata.
 */
export declare class DecoratedServiceRecord implements ServiceRecord {
    originalMeta: ClassServiceMetadata;
    provider: string;
    id: string;
    gid: string;
    priority: number;
    clazz: any;
    isDisabled?: boolean;
    isFactory?: boolean;
    injectConfig: string;
    config?: Record<string, any>;
    interfaces: string[];
    status: ServiceState;
    factory: string;
    injectableFactory: InjectableList;
    activator: string;
    deactivator: string;
    dependencies: Record<string, DependencyMeta["matchCriteria"]>;
    injectableMethods: Record<string, InjectableList>;
    subscribeToInterfaces: string[];
    constructor(classMeta: DecoratedClass);
    private initFromDecoratedClass;
    private processMethods;
    clone(override: ServiceMeta): DecoratedServiceRecord;
    /**
     * Returns a new instance with a deep copy of service meta.
     */
    cloneAndRegisterNewService(newId: string, override: ServiceMeta): DecoratedServiceRecord;
    createNewClassServiceMeta(override: ServiceMeta): ClassServiceMetadata;
}
export declare const getAllServicesMap: () => Record<string, DecoratedServiceRecord[]>;
export declare const getAllServicesByGidMap: () => Record<string, DecoratedServiceRecord>;
export declare const getAllServicesForBundle: (bundleId: string) => DecoratedServiceRecord[];
export declare const getServiceMetadataBuilder: () => DecoratedClassBuilder<ServiceMeta, MethodInvoker, DependencyMeta, any>;
export declare const cloneServiceRecord: (rec: ServiceRecord) => ServiceRecord;
/**
 * Generates the full service reference for a config from default provider. Note that the suffixes
 * are derived from ID_RUNTIME and CONFIG_PROVIDER_SUFFIX in `common/runtime.ts`. For circular dep
 * avoidance, moving to this file and dropping const refs.
 */
export declare const makeConfigId: (subId: string) => string;
/**
 * Returns the subId or undefined from a service reference of the form `subId@runtime.configProvider`.
 */
export declare const extractConfigSubId: (configId: string) => string | undefined;
