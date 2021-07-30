"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHttpMetaByGids = exports.getHttpAnnotations = exports.RequestParam = exports.ErrorMiddleware = exports.Middleware = exports.Route = exports.isParameterEmpty = exports.Controller = void 0;
const decorator_1 = require("../decorator");
const types_1 = require("./types");
const collector = new decorator_1.DecoratedClassBuilder("dinoframe.http");
exports.Controller = (params = {}) => {
    return (target) => {
        collector.pushClass(target, params, "Controller");
    };
};
exports.isParameterEmpty = (v) => v === "" || v === undefined || v === null;
exports.Route = (params) => {
    return (proto, name, desc) => {
        collector.pushMethod(proto, name, {
            type: types_1.HandlerConfigType.route,
            name,
            desc,
            ...params,
        }, "Route");
    };
};
exports.Middleware = (params = {}) => {
    return (proto, name, desc) => {
        collector.pushMethod(proto, name, {
            type: types_1.HandlerConfigType.middleware,
            name,
            desc,
            ...params,
        }, "Middleware");
    };
};
exports.ErrorMiddleware = (params = {}) => {
    return (proto, name, desc) => {
        collector.pushMethod(proto, name, {
            type: types_1.HandlerConfigType.error,
            name,
            desc,
            ...params,
        }, "ErrorMiddleware");
    };
};
exports.RequestParam = (name, params = {}) => {
    return (proto, method, pos) => {
        collector.pushParameter(proto, method, pos, { name, method, pos, ...params }, "RequestParam");
    };
};
exports.getHttpAnnotations = () => collector.getFinalized();
exports.getHttpMetaByGids = (gids) => {
    return collector.getFinalized().filter((rec) => gids.includes(rec.gid));
};
//# sourceMappingURL=decorators.js.map