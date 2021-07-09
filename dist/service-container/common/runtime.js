"use strict";
/**
 * Standard runtime discoverability types and services.
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const decorator_1 = require("../../decorator");
const decorators_1 = require("../decorators");
const types_1 = require("../types");
/** The default runtime bundle id. */
exports.ID_RUNTIME = "runtime";
/** Default runtime bundle. */
const RuntimeBundle = decorator_1.BundleDecoratorFactory(exports.ID_RUNTIME);
/**
 * Basic implementation of a config.
 */
class StandardConfig {
    constructor(cfg) {
        this.config = {};
        this.config = { ...cfg };
    }
    get(key) {
        return this.config[key];
    }
    getWithPrefix(keyPrefix) {
        const env = {};
        for (const key of Object.keys(this.config)) {
            if (key.startsWith(keyPrefix)) {
                env[key] = this.config[key];
            }
        }
        return env;
    }
    getAll() {
        return { ...this.config };
    }
}
exports.StandardConfig = StandardConfig;
/** Interface of the defacto RuntimeEnv instance. */
exports.INTERFACE_ENV = "runtime.env";
/**
 * Exposes **process.env** as a `Config`. Nothing fancy.
 *
 * To ensure your environment instance is the default, always use `{matchInterface: INTERFACE_ENV}`
 * and set your service to a higher priority.
 */
let DefaultRuntimeEnv = class DefaultRuntimeEnv {
    static makeRuntimeEnv() {
        return new StandardConfig(process.env);
    }
};
__decorate([
    decorators_1.Factory
], DefaultRuntimeEnv, "makeRuntimeEnv", null);
DefaultRuntimeEnv = __decorate([
    RuntimeBundle,
    decorators_1.Service(`${exports.ID_RUNTIME}.environment`, {
        interfaces: [exports.INTERFACE_ENV],
        priority: types_1.ContainerPhases.bootstrap,
    })
], DefaultRuntimeEnv);
exports.DefaultRuntimeEnv = DefaultRuntimeEnv;
exports.discover = () => {
    return exports.ID_RUNTIME;
};
//# sourceMappingURL=runtime.js.map