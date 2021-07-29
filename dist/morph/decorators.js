"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMorpherById = exports.getMorphManager = exports.getMorpherDefByGid = exports.getMorpherDefinitions = exports.Deserialize = exports.Serialize = exports.Finalize = exports.PropertyGet = exports.PropertySet = exports.Property = exports.Morph = void 0;
const types_1 = require("./types");
const index_1 = require("./index");
const registry_1 = require("../decorator/registry");
const lodash_clonedeep_1 = __importDefault(require("lodash.clonedeep"));
const builder = types_1.getMorphDecoratorBuilder();
/**
 * Class -- marks a class as being morphable.
 */
exports.Morph = (params = {}) => {
    return (target) => {
        var _a;
        if (params.discriminator && !params.inherits) {
            // create static map that subclasses will populate
            const discriminatorCol = params.discriminator;
            target.___discriminatorCol = discriminatorCol;
            target.___discriminatorMap = {};
        }
        builder.pushClass(target, { ...params }, "Morph");
        if (((_a = params.inherits) === null || _a === void 0 ? void 0 : _a.discriminatorValue) && !params.discriminator) {
            // populate static map of parent
            const parent = params.inherits.baseClass;
            if (!parent) {
                throw new types_1.MorphError(`${target.name}: inherits.baseClass not specified`);
            }
            const dvalue = params.inherits.discriminatorValue;
            if (!dvalue) {
                throw new types_1.MorphError(`${target.name}: inherits.discriminatorValue not specified`);
            }
            else if (parent.___discriminatorMap[dvalue]) {
                throw new types_1.MorphError(`${target.name}: inherits.discriminatorValue '${dvalue}' already mapped to a subclass`);
            }
            parent.___discriminatorMap[dvalue] = target;
        }
    };
};
/**
 * Property -- the property to map a source value onto.
 */
exports.Property = (params = {}) => {
    return (target, name) => {
        if (params.type == "enum" &&
            (!params.enumValues || params.enumValues.length == 0)) {
            throw new types_1.MorphError(`${target}: type set as 'enum' but enumValues is missing/empty`);
        }
        builder.pushProperty(target, name, { name, ...params, propertyName: name }, "Property");
    };
};
/**
 * Method -- the setter for property with given name. Overrides @Property for set.
 */
exports.PropertySet = (name) => {
    return (target, methodName, desc) => {
        builder.pushMethod(target, methodName, { name, setter: methodName }, "PropertySet");
    };
};
/**
 * Method -- the getter for property with given name. Overides @Property for get.
 */
exports.PropertyGet = (name) => {
    return (target, methodName, desc) => {
        builder.pushMethod(target, methodName, { name, getter: methodName }, "PropertyGet");
    };
};
/**
 * Method -- if defined, the method is invoked after deserialization to allow any necessary cleanup
 * steps and also do more complex validation. If instance fails deserialization, should throw
 * `ObjectError`
 */
exports.Finalize = (target, methodName, desc) => {
    builder.pushMethod(target, methodName, { finalize: methodName }, "Finalize");
};
/**
 * Method -- if defined, defers all serialization to this method and should have the signature
 * `(morphManager?: MorpherManager<any>)`.
 */
exports.Serialize = (target, methodName, desc) => {
    builder.pushMethod(target, methodName, { serialize: methodName }, "Serialize");
};
/**
 * Method -- if defined, defers all deserialization to this method and should have the signature
 * `(source: any, morphManager?: MorpherManager<any>)`.
 */
exports.Deserialize = (target, methodName, desc) => {
    builder.pushMethod(target, methodName, { deserialize: methodName }, "Deserialize");
};
exports.getMorpherDefinitions = () => {
    return builder.getFinalized().map(lodash_clonedeep_1.default);
};
exports.getMorpherDefByGid = (clazzOrGid) => {
    if (!clazzOrGid) {
        return;
    }
    const gid = typeof clazzOrGid == "string" ? clazzOrGid : registry_1.getGid(clazzOrGid);
    return lodash_clonedeep_1.default(builder.getByGid(gid));
};
let morphManager = null;
let builderChangeTicks = 0;
exports.getMorphManager = () => {
    if (!morphManager || builder.getChangeTicks() > builderChangeTicks) {
        builderChangeTicks = builder.getChangeTicks();
        morphManager = new index_1.BasicMorpherManager(exports.getMorpherDefinitions());
    }
    return morphManager;
};
exports.getMorpherById = (clazzOrGid) => {
    return exports.getMorphManager().getByClassOrId(clazzOrGid);
};
//# sourceMappingURL=decorators.js.map