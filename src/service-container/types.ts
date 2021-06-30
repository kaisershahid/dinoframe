import {DecoratedClass, DecoratedClassBuilder} from "../decorator";

export type BaseServiceMeta = {
    interfaces?: string[];
    disabled?: boolean;
    /** Default 0. Higher number means earlier start. Load order on tie. */
    priority?: number;
}

export type ServiceMeta = BaseServiceMeta & {
    id: string;
    gid: string;
}

export enum ServiceState {
    registered = 0,
    activated = 32,
    deactivated = 64
}

export type InjectableList = (DependencyMeta | undefined)[];

export type ServiceRecord = {
    id: string;
    gid: string;
    priority: number;
    interfaces: string[];
    clazz: any;
    status: ServiceState;
    factory: string;
    injectableFactory: InjectableList;
    activator: string;
    deactivator: string;
    dependencies: Record<string, any>;
    injectableMethods: Record<string, InjectableList>;
}

export enum MethodType {
    activate = 1,
    deactivate = 2,
    factory = 3,
    injectable = 4
}

export type MethodInvoker = {
    type: MethodType;
    name: string;
}

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
    }
}

export type ServiceProviderMeta = {}

export type ScopedFactoryServiceMeta = {};

export type ClassServiceMetadata = DecoratedClass<ServiceMeta,
    MethodInvoker,
    any,
    DependencyMeta>;

export const getServiceMetadataBuilder = () => {
    return new DecoratedClassBuilder<ServiceMeta,
        MethodInvoker,
        DependencyMeta>();
}

/**
 * Normalizes DecoratedClass metadata.
 */
export class DecoratedServiceRecord implements ServiceRecord {
    id: string = '';
    gid: string = '';
    priority = 0;
    clazz: any;
    interfaces: string[] = [];
    status: ServiceState = ServiceState.registered;
    factory = '';
    injectableFactory: InjectableList = [];
    activator = '';
    deactivator = '';
    dependencies: Record<string, DependencyMeta['matchCriteria']> = {};
    injectableMethods: Record<string, InjectableList> = {};

    constructor(classMeta: ClassServiceMetadata) {
        this.id = classMeta.metadata[0].id;
        this.gid = classMeta.metadata[0].gid;
        this.clazz = classMeta.clazz;
        this.priority = classMeta.metadata[0].priority ?? 0;
        this.interfaces = classMeta.metadata[0].interfaces ?? [];
        // @todo process explicit deps
        this.processMethods(classMeta);
    }

    private processMethods(classMeta: ClassServiceMetadata) {
        for (const methodName of Object.keys(classMeta.methods)) {
            const mrec = classMeta.methods[methodName];
            const params = mrec.parameters.map((params) => {
                if (params) {
                    if (params[0].id) {
                        this.dependencies[params[0].id] = {};
                    }
                    if (params[0].matchInterface) {
                        this.dependencies['#' + params[0].matchInterface] = params[0].matchCriteria ?? {min: 1};
                    }
                    return params[0];
                }
                return undefined;
            });

            // regular setter methods have no metadata on method, only params
            switch (mrec.metadata[0]?.type) {
                case MethodType.activate:
                    this.activator = methodName;
                    break;
                case MethodType.deactivate:
                    this.deactivator = methodName;
                    break;
                case MethodType.factory:
                    // expecting 1 injectable decorator per param
                    this.factory = methodName;
                    this.injectableFactory = params
                    break;
                default:
                    this.injectableMethods[methodName] = params;
            }
        }
    }
}

export interface ServiceContainer {
    resolve<T extends any = any>(id: string): T;

    query<T extends any = any>(matchInterface: string): T[];

    startup(): Promise<ServiceContainer>;

    shutdown(): Promise<ServiceContainer>;

    register(metadata: DecoratedServiceRecord);

    // unregister(id: string);
    // newScope(): ServiceContainer;
}
