"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractConfigSubId = exports.makeConfigId = exports.cloneServiceRecord = exports.getServiceMetadataBuilder = exports.getAllServicesForBundle = exports.getAllServicesByGidMap = exports.getAllServicesMap = exports.DecoratedServiceRecord = void 0;
const types_1 = require("./types");
const decorator_1 = require("../decorator");
const decorators_1 = require("./decorators");
const lodash_clonedeep_1 = __importDefault(require("lodash.clonedeep"));
const registry_1 = require("../decorator/registry");
/**
 * Normalizes DecoratedClass metadata.
 */
class DecoratedServiceRecord {
    constructor(classMeta) {
        this.provider = "";
        this.id = "";
        this.gid = "";
        this.priority = 0;
        this.injectConfig = "";
        this.interfaces = [];
        this.status = types_1.ServiceState.registered;
        this.factory = "";
        this.injectableFactory = [];
        this.activator = "";
        this.deactivator = "";
        this.dependencies = {};
        this.injectableMethods = {};
        this.subscribeToInterfaces = [];
        this.originalMeta = classMeta;
        this.initFromDecoratedClass(classMeta);
    }
    initFromDecoratedClass(classMeta) {
        var _a, _b, _c;
        if (classMeta.metadata.length != 1) {
            throw new Error(`expected exactly 1 decoration, got: ${classMeta.metadata.length}`);
        }
        this.provider = classMeta._provider;
        this.id = classMeta.metadata[0].id;
        this.gid = classMeta.metadata[0].gid;
        this.isDisabled = classMeta.metadata[0].disabled;
        this.isFactory = classMeta.metadata[0].isFactory;
        this.config = classMeta.metadata[0].config;
        const ic = classMeta.metadata[0].injectConfig;
        if (ic) {
            this.injectConfig = ic === true ? exports.makeConfigId(this.id) : ic;
            this.dependencies[this.injectConfig] = {};
        }
        this.clazz = classMeta.clazz;
        this.priority = (_a = classMeta.metadata[0].priority) !== null && _a !== void 0 ? _a : 0;
        this.interfaces = (_b = classMeta.metadata[0].interfaces) !== null && _b !== void 0 ? _b : [];
        this.subscribeToInterfaces = (_c = classMeta.metadata[0].subscribeToInterfaces) !== null && _c !== void 0 ? _c : [];
        this.processMethods(classMeta.methods);
        this.processMethods(classMeta.staticMethods, true);
    }
    processMethods(methods, isStatic = false) {
        var _a;
        for (const methodName of Object.keys(methods)) {
            const mrec = methods[methodName];
            const params = mrec.parameters.map((params) => {
                var _a;
                if (params) {
                    if (params[0].id) {
                        this.dependencies[params[0].id] = {};
                    }
                    if (params[0].matchInterface) {
                        this.dependencies["#" + params[0].matchInterface] = (_a = params[0]
                            .matchCriteria) !== null && _a !== void 0 ? _a : { min: 1 };
                    }
                    return params[0];
                }
                return undefined;
            });
            // regular setter methods have no metadata on method, only params
            switch ((_a = mrec.metadata[0]) === null || _a === void 0 ? void 0 : _a.type) {
                case types_1.MethodType.activate:
                    this.activator = methodName;
                    break;
                case types_1.MethodType.deactivate:
                    this.deactivator = methodName;
                    break;
                case types_1.MethodType.factory:
                    // expecting 1 injectable decorator per param
                    this.factory = methodName;
                    this.injectableFactory = params;
                    break;
                default:
                    this.injectableMethods[methodName] = params;
            }
        }
    }
    clone(override) {
        return new DecoratedServiceRecord(this.createNewClassServiceMeta(override));
    }
    /**
     * Returns a new instance with a deep copy of service meta.
     */
    cloneAndRegisterNewService(newId, override) {
        const newClass = class extends this.clazz {
        };
        const newGid = registry_1.getOrMakeGidForConstructor(newClass);
        newClass.getDecoratorGid = () => {
            return newGid;
        };
        const newMeta = this.createNewClassServiceMeta(override);
        newMeta.clazz = newClass;
        newMeta.gid = newGid;
        newMeta.metadata[0].id = newId;
        newMeta.metadata[0].gid = newGid;
        return new DecoratedServiceRecord(newMeta);
    }
    createNewClassServiceMeta(override) {
        const newMeta = lodash_clonedeep_1.default(this.originalMeta);
        const rec = newMeta.metadata[0];
        const { priority, config, injectConfig, isFactory, interfaces, disabled } = override;
        rec.disabled = disabled === undefined ? this.isDisabled : disabled;
        if (priority !== undefined) {
            rec.priority = priority;
        }
        if (config) {
            rec.config = config;
        }
        if (injectConfig) {
            rec.injectConfig = injectConfig;
        }
        if (isFactory) {
            rec.isFactory = isFactory;
        }
        if (interfaces) {
            rec.interfaces = [...interfaces];
        }
        return newMeta;
    }
}
exports.DecoratedServiceRecord = DecoratedServiceRecord;
exports.getAllServicesMap = () => {
    const map = {};
    for (const rec of decorators_1.getDecoratedServiceRecords()) {
        if (!map[rec.id]) {
            map[rec.id] = [];
        }
        map[rec.id].push(rec);
    }
    return map;
};
exports.getAllServicesByGidMap = () => {
    const map = {};
    for (const rec of decorators_1.getDecoratedServiceRecords()) {
        map[rec.gid] = rec;
    }
    return map;
};
let allServiceByGid;
exports.getAllServicesForBundle = (bundleId) => {
    if (!allServiceByGid) {
        allServiceByGid = exports.getAllServicesByGidMap();
    }
    const gids = decorator_1.getGidsForBundle(bundleId);
    const recs = [];
    for (const gid of gids) {
        if (allServiceByGid[gid]) {
            recs.push(allServiceByGid[gid]);
        }
    }
    return recs;
};
exports.getServiceMetadataBuilder = () => {
    return new decorator_1.DecoratedClassBuilder("service-container");
};
exports.cloneServiceRecord = (rec) => {
    return {
        provider: rec.provider,
        id: rec.id,
        gid: rec.gid,
        priority: rec.priority,
        clazz: rec.clazz,
        isDisabled: rec.isDisabled,
        isFactory: rec.isFactory,
        injectConfig: rec.injectConfig,
        config: rec.config,
        interfaces: [...rec.interfaces],
        status: types_1.ServiceState.registered,
        factory: rec.factory,
        injectableFactory: [...rec.injectableFactory],
        activator: rec.activator,
        deactivator: rec.deactivator,
        dependencies: { ...rec.dependencies },
        injectableMethods: { ...rec.injectableMethods },
        subscribeToInterfaces: [...rec.subscribeToInterfaces],
    };
};
/**
 * Generates the full service reference for a config from default provider. Note that the suffixes
 * are derived from ID_RUNTIME and CONFIG_PROVIDER_SUFFIX in `common/runtime.ts`. For circular dep
 * avoidance, moving to this file and dropping const refs.
 */
exports.makeConfigId = (subId) => `${subId}@runtime.configProvider`;
/**
 * Returns the subId or undefined from a service reference of the form `subId@runtime.configProvider`.
 */
exports.extractConfigSubId = (configId) => {
    const [s1, s2] = configId.split("@runtime.configProvider");
    return s2 === undefined ? undefined : s1;
};
//# sourceMappingURL=utils.js.map