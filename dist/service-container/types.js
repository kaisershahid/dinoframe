"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MethodType = exports.ServiceState = exports.ContainerPhases = void 0;
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
//# sourceMappingURL=types.js.map