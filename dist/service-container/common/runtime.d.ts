/**
 * Standard runtime discoverability types and services.
 */
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
