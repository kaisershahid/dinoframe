/**
 * Standard runtime discoverability types and services.
 */
import { FactoryContainer, InterfaceAvailableListener } from "../types";
/** The default runtime bundle id. */
export declare const ID_RUNTIME = "runtime";
/**
 * Encapsulates gettable values. Used to expose environment vars, service configs, etc.
 */
export interface Config {
    get(key: string): any;
    getWithPrefix(keyPrefix: string): Record<string, any>;
    getAll(): Record<string, any>;
}
/**
 * Config service with id. Typically used in conjunction with `INTERFACE_CONFIG_INSTANCE` so that
 * you can hook into main config provider with your own instance.
 */
export interface ConfigWithId extends Config {
    getId(): string;
}
/**
 * Basic implementation of a config.
 */
export declare class StandardConfig implements Config {
    private config;
    constructor(cfg: any);
    get(key: string): any;
    getWithPrefix(keyPrefix: string): Record<string, any>;
    getAll(): {
        [x: string]: any;
    };
}
export declare class StandardConfigWithId extends StandardConfig implements ConfigWithId {
    id: string;
    constructor(id: string, cfg: any);
    getId(): string;
}
/** Interface of the defacto RuntimeEnv instance. */
export declare const INTERFACE_ENV = "runtime.env";
/**
 * Exposes **process.env** as a `Config`. Nothing fancy.
 *
 * To ensure your environment instance is the default, always use `{matchInterface: INTERFACE_ENV}`
 * and set your service to a higher priority.
 */
export declare class DefaultRuntimeEnv {
    static makeRuntimeEnv(): StandardConfig;
}
export declare const discover: () => string;
export declare const CONFIG_PROVIDER_SUFFIX = "configProvider";
/**
 * Allows ConfigProvider to handle service as ConfigWithId.
 */
export declare const INTERFACE_CONFIG_INSTANCE: string;
export declare class RuntimeConfigProvider implements FactoryContainer, InterfaceAvailableListener {
    private static singleton;
    configs: Record<string, any>;
    static getSingleton(): RuntimeConfigProvider;
    has(id: string): boolean;
    resolve<T>(id: string): T;
    addConfig(id: string, config: Record<string, any>): void;
    onAvailableInterface(_interface: string, services: any[]): void;
    setConfigs(configs: StandardConfigWithId[]): void;
}
