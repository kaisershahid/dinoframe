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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var RuntimeConfigProvider_1;
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
class StandardConfigWithId extends StandardConfig {
    constructor(id, cfg) {
        super(cfg);
        this.id = id;
    }
    getId() {
        return this.id;
    }
}
exports.StandardConfigWithId = StandardConfigWithId;
/** Interface of the defacto RuntimeEnv instance. */
exports.INTERFACE_ENV = "runtime.env";
console.log(decorators_1.Service);
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
exports.CONFIG_PROVIDER_SUFFIX = "configProvider";
/**
 * Allows ConfigProvider to handle service as ConfigWithId.
 */
exports.INTERFACE_CONFIG_INSTANCE = `${exports.CONFIG_PROVIDER_SUFFIX}.configInstance`;
let RuntimeConfigProvider = RuntimeConfigProvider_1 = class RuntimeConfigProvider {
    constructor() {
        this.configs = {};
    }
    static getSingleton() {
        return this.singleton;
    }
    has(id) {
        return this.configs[id] !== undefined;
    }
    resolve(id) {
        if (!this.configs[id]) {
            throw new Error(`could not find config: ${id}`);
        }
        return this.configs[id];
    }
    addConfig(id, config) {
        this.configs[id] = config;
    }
    onAvailableInterface(_interface, services) {
        for (const svc of services) {
            if (svc.getId && svc.getAll) {
                this.addConfig(svc.getId(), svc);
            }
        }
    }
    setConfigs(configs) {
        this.onAvailableInterface('', configs);
    }
};
RuntimeConfigProvider.singleton = new RuntimeConfigProvider_1();
__decorate([
    __param(0, decorators_1.Inject({ matchInterface: exports.INTERFACE_CONFIG_INSTANCE, matchCriteria: { min: 0 } }))
], RuntimeConfigProvider.prototype, "setConfigs", null);
__decorate([
    decorators_1.Factory
], RuntimeConfigProvider, "getSingleton", null);
RuntimeConfigProvider = RuntimeConfigProvider_1 = __decorate([
    RuntimeBundle,
    decorators_1.Service(`${exports.ID_RUNTIME}.${exports.CONFIG_PROVIDER_SUFFIX}`, {
        isFactory: true,
        priority: types_1.ContainerPhases.bootstrap,
        subscribeToInterfaces: [exports.INTERFACE_CONFIG_INSTANCE]
    })
], RuntimeConfigProvider);
exports.RuntimeConfigProvider = RuntimeConfigProvider;
//# sourceMappingURL=runtime.js.map