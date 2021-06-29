export type BaseServiceMeta = {
    interfaces?: string[];
    disabled?: boolean;
    /** Default 0. Higher number means earlier start. Load order on tie. */
    priority?: number;
}

export type ServiceMeta = BaseServiceMeta & {
    id: string;
}

export enum MethodType {
    activate = 1,
    deactivate = 2,
    factory = 3
}
export type MethodInvoker = {
    type: MethodType;
    name: string;
}

export type DependencyMeta = {
    /** Id of dependency. Takes precedence over interfaces */
    id?: string;
    /** match 1 of the interfaces */
    interfaces?: string[];
}

export type ServiceProviderMeta = {}

export type ScopedFactoryServiceMeta = {}
