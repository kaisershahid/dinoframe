import { BaseServiceMeta } from "../types";
import { DecoratedServiceRecord } from "../utils";
export type BundleConfigService = {
    id: string;
    runtimeId?: string;
    /** @todo if present, set runtimeId as `idPrefix + '.' + id` */
    idPrefix?: string;
    disabled?: boolean;
    meta?: Partial<BaseServiceMeta>;
    config?: Record<string, any>;
};
export type BundleConfig = {
    bundleDependencies?: string[];
    moduleDependencies?: string[];
    services: BundleConfigService[];
};
export declare class BundleActivator {
    private id;
    private config;
    constructor(id: string, config: BundleConfig);
    loadDependencies(): string[];
    processServiceRecords(bundleRecs: DecoratedServiceRecord[], serviceMap: Record<string, DecoratedServiceRecord[]>): DecoratedServiceRecord[];
}
