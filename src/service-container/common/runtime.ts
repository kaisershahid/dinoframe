/**
 * Standard runtime discoverability types and services.
 */

import {BundleDecoratorFactory} from "../../decorator";
import {Factory, Service} from "../decorators";
import {ContainerPhases} from "../types";

/** The default runtime bundle id. */
export const ID_RUNTIME = 'runtime';
/** Default runtime bundle. */
const RuntimeBundle = BundleDecoratorFactory(ID_RUNTIME);

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
export class StandardConfig implements Config {
    private config: Record<string, any> = {};

    constructor(cfg: any) {
        this.config = {...cfg};
    }

    get(key: string): any {
        return this.config[key];
    }

    getWithPrefix(keyPrefix: string): Record<string, any> {
        const env: any = {};
        for (const key of Object.keys(this.config)) {
            if (key.startsWith(keyPrefix)) {
                env[key] = this.config[key];
            }
        }
        return env;
    }

    getAll() {
        return {...this.config}
    }
}

/** Interface of the defacto RuntimeEnv instance. */
export const INTERFACE_ENV = 'runtime.env';

/**
 * Exposes **process.env** as a `Config`. Nothing fancy.
 *
 * To ensure your environment instance is the default, always use `{matchInterface: INTERFACE_ENV}`
 * and set your service to a higher priority.
 */
@RuntimeBundle
@Service(`${ID_RUNTIME}.environment`, {
    interfaces: [INTERFACE_ENV],
    priority: ContainerPhases.bootstrap
})
export class DefaultRuntimeEnv {
    @Factory
    static makeRuntimeEnv() {
        return new StandardConfig(process.env);
    }
}

export const discover = () => {
    return ID_RUNTIME;
}
