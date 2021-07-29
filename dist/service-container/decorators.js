"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addNewServiceMeta = exports.getDecoratedServiceRecords = exports.Inject = exports.Dependency = exports.Deactivate = exports.Activate = exports.Factory = exports.Service = void 0;
const types_1 = require("./types");
const registry_1 = require("../decorator/registry");
const utils_1 = require("./utils");
const builder = utils_1.getServiceMetadataBuilder();
/**
 * Class -- marks the class as a singleton service. If `isFactory` is true, service is treated as
 * a sub-service factory. Don't confuse with `@Factory`.
 */
exports.Service = (id, meta = {}) => {
    return (clazz) => {
        builder.pushClass(clazz, { id, gid: registry_1.getOrMakeGidForConstructor(clazz), ...meta }, "Service");
    };
};
/**
 * Method (static) -- if defined, expected to return service instance. Necessary if you prefer to use
 * constructor injection.
 */
exports.Factory = (target, name, desc) => {
    builder.pushMethod(target, name, { type: types_1.MethodType.factory, name }, "Factory");
};
/**
 * Method -- if defined, invoked before service is marked as active. error blocks
 * dependents.
 */
exports.Activate = (target, name, desc) => {
    builder.pushMethod(target, name, { type: types_1.MethodType.activate, name }, "Activate");
};
/**
 * Method -- invoked on shutdown. error is logged as error; does not block dependents.
 */
exports.Deactivate = (target, name, desc) => {
    builder.pushMethod(target, name, { type: types_1.MethodType.deactivate, name }, "Deactivate");
};
/**
 * Class -- defines a dependency as service id or 1+ interfaces to match.
 */
exports.Dependency = (params) => {
    return (target) => {
        // @todo need a more parameterized way to insert different types of same rec class
    };
};
/**
 * Parameter (extends behavior of @Dependency) --  injects dependency into argument
 */
exports.Inject = (params) => {
    return (target, name, pos) => {
        builder.pushParameter(target, name, pos, { ...params }, "Inject");
    };
};
let finalServices;
let serviceToMeta = {};
/**
 * Returns ALL processed @Service as DecoratedServiceRecord instances
 */
exports.getDecoratedServiceRecords = () => {
    if (!finalServices) {
        finalServices = builder.getFinalized();
    }
    return finalServices.map((meta) => {
        return new utils_1.DecoratedServiceRecord(meta);
    });
};
/**
 * Registers new new through a ClassServiceMetadata object. @Service.id must
 * be unique.
 */
exports.addNewServiceMeta = (meta) => {
    const id = meta.metadata[0].id;
    if (serviceToMeta[id]) {
        return false;
    }
    if (!finalServices) {
        finalServices = builder.getFinalized();
    }
    const metaCopy = { ...meta };
    finalServices.push(metaCopy);
    serviceToMeta[id] = metaCopy;
    return true;
};
//# sourceMappingURL=decorators.js.map