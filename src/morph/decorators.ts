import {
  getMorphDecoratorBuilder,
  MorphError,
  MorphParams,
  ObjectError,
  PropertyParams
} from "./types";
import {Morpher} from "./index";
import {getGid, swapConstructorWithSubclass} from "../decorator/registry";
import {type} from "os";

const builder = getMorphDecoratorBuilder();

/**
 * Class -- marks a class as being morphable.
 */
export const Morph = (params: MorphParams = {}) => {
  return (target: any) => {
    if (params.discriminator && !params.inherits) {
      // create static map that subclasses will populate
      const discriminatorCol = params.discriminator;
      target.___discriminatorCol = discriminatorCol;
      target.___discriminatorMap = {};
    }

    builder.pushClass(target, {...params}, 'Morph');

    if (params.inherits?.discriminatorValue && !params.discriminator) {
      // populate static map of parent
      const parent = params.inherits.baseClass;
      if (!parent) {
        throw new MorphError(`${target.name}: inherits.baseClass not specified`)
      }
      const dvalue = params.inherits.discriminatorValue;
      if (!dvalue) {
        throw new MorphError(`${target.name}: inherits.discriminatorValue not specified`)
      } else if (parent.___discriminatorMap[dvalue]) {
        throw new MorphError(`${target.name}: inherits.discriminatorValue '${dvalue}' already mapped to a subclass`)
      }

      parent.___discriminatorMap[dvalue] = target;
    }
  }
}

/**
 * Property -- the property to map a source value onto.
 */
export const Property = (params: Partial<PropertyParams> = {}) => {
  return (target: any, name: string) => {
    if (params.type == 'enum' && (!params.enumValues || params.enumValues.length == 0)) {
      throw new MorphError(`${target}: type set as 'enum' but enumValues is missing/empty`)
    }
    builder.pushProperty(target, name, {name, ...params, propertyName: name}, 'Property');
  }
}

/**
 * Method -- the setter for property with given name. Overrides @Property for set.
 */
export const PropertySet = (name: string) => {
  return (target: any, methodName: string, desc: PropertyDescriptor) => {
    builder.pushMethod(target, methodName, {name, setter: methodName}, 'PropertySet')
  }
}

/**
 * Method -- the getter for property with given name. Overides @Property for get.
 */
export const PropertyGet = (name: string) => {
  return (target: any, methodName: string, desc: PropertyDescriptor) => {
    builder.pushMethod(target, methodName, {name, getter: methodName}, 'PropertyGet')
  }
}

/**
 * Method -- if defined, the method is invoked after deserialization to allow any necessary cleanup
 * steps and also do more complex validation. If instance fails deserialization, should throw
 * `ObjectError`
 * @todo
 */
export const Finalize = () => {
  return (target: any, methodName: string, desc: PropertyDescriptor) => {
    builder.pushMethod(target, methodName, {finalize: methodName}, 'Validate')
  }
}

/**
 * Method -- if defined, defers all serialization to this method.
 * @todo
 */
export const Serialize = () => {
  throw new Error('not implemented');
}

/**
 * Method -- if defined, defers all deserialization to this method and should have the signature
 * `(source: any)`.
 * @todo
 */
export const Deserialize = () => {
  throw new Error('not implemented');
}

export const getMorpherDefinitions = () => {
  // @todo deep copy
  return builder.getFinalized();
}

export const getMorphers = () => {
  return getMorpherDefinitions().map(r => new Morpher(r))
}

export const getMorpherDefByGid = (clazzOrGid: any) => {
  if (!clazzOrGid) {
    return;
  }
  const gid = typeof clazzOrGid == 'string' ? clazzOrGid : getGid(clazzOrGid);
  return builder.getByGid(gid);
}

export const getMorpherById = (clazzOrGid: any) => {
  const meta = getMorpherDefByGid(clazzOrGid);
  return meta ? new Morpher(meta) : undefined;
}
