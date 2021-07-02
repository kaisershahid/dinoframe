"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const decorator_1 = require("../decorator");
/**
 * These are the standard priorities used to organize startup. Note that priorities don't absolutely
 * guarantee starting before lower priorities -- if a higher priority service has to wait on a lower
 * level service, this would never be satisfied. Treat highest priority services as:
 *
 * - those having no dependencies (or dependences that are likely high priority) AND
 * - are a base dependency for large branches of the service tree
 */
var ContainerPhases;
(function (ContainerPhases) {
    /** The most vital services necessary to connect the next layer */
    ContainerPhases[ContainerPhases["bootstrap"] = 10000] = "bootstrap";
    /** Critical db and other data provider initialization */
    ContainerPhases[ContainerPhases["datalink"] = 90000] = "datalink";
    /** Config handlers necessary to provide configs for lower priority services */
    ContainerPhases[ContainerPhases["config"] = 80000] = "config";
    ContainerPhases[ContainerPhases["usercritical"] = 10000] = "usercritical";
    ContainerPhases[ContainerPhases["default"] = 0] = "default";
    ContainerPhases[ContainerPhases["userlow"] = -10000] = "userlow";
})(ContainerPhases = exports.ContainerPhases || (exports.ContainerPhases = {}));
var ServiceState;
(function (ServiceState) {
    ServiceState[ServiceState["registered"] = 0] = "registered";
    ServiceState[ServiceState["activating"] = 11] = "activating";
    ServiceState[ServiceState["activated"] = 20] = "activated";
    ServiceState[ServiceState["deactivating"] = 21] = "deactivating";
    ServiceState[ServiceState["deactivated"] = 30] = "deactivated";
})(ServiceState = exports.ServiceState || (exports.ServiceState = {}));
var MethodType;
(function (MethodType) {
    MethodType[MethodType["activate"] = 1] = "activate";
    MethodType[MethodType["deactivate"] = 2] = "deactivate";
    MethodType[MethodType["factory"] = 3] = "factory";
    MethodType[MethodType["injectable"] = 4] = "injectable";
})(MethodType = exports.MethodType || (exports.MethodType = {}));
exports.getServiceMetadataBuilder = () => {
    return new decorator_1.DecoratedClassBuilder('service-container');
};
/**
 * Normalizes DecoratedClass metadata.
 */
class DecoratedServiceRecord {
    constructor(classMeta) {
        var _a, _b;
        this.id = '';
        this.gid = '';
        this.priority = 0;
        this.interfaces = [];
        this.status = ServiceState.registered;
        this.factory = '';
        this.injectableFactory = [];
        this.activator = '';
        this.deactivator = '';
        this.dependencies = {};
        this.injectableMethods = {};
        this.provider = classMeta._provider;
        this.id = classMeta.metadata[0].id;
        this.gid = classMeta.metadata[0].gid;
        const ic = classMeta.metadata[0].injectConfig;
        if (ic) {
            this.injectConfig = ic === true ? `config/${this.id}` : ic;
            this.dependencies[this.injectConfig] = {};
        }
        this.clazz = classMeta.clazz;
        this.priority = (_a = classMeta.metadata[0].priority) !== null && _a !== void 0 ? _a : 0;
        this.interfaces = (_b = classMeta.metadata[0].interfaces) !== null && _b !== void 0 ? _b : [];
        // @todo process explicit deps
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
                        this.dependencies['#' + params[0].matchInterface] = (_a = params[0].matchCriteria) !== null && _a !== void 0 ? _a : { min: 1 };
                    }
                    return params[0];
                }
                return undefined;
            });
            // regular setter methods have no metadata on method, only params
            switch ((_a = mrec.metadata[0]) === null || _a === void 0 ? void 0 : _a.type) {
                case MethodType.activate:
                    this.activator = methodName;
                    break;
                case MethodType.deactivate:
                    this.deactivator = methodName;
                    break;
                case MethodType.factory:
                    // expecting 1 injectable decorator per param
                    this.factory = methodName;
                    this.injectableFactory = params;
                    break;
                default:
                    this.injectableMethods[methodName] = params;
            }
        }
    }
}
exports.DecoratedServiceRecord = DecoratedServiceRecord;
//# sourceMappingURL=types.js.map