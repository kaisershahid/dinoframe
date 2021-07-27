import {
  DecoratedMorphClass,
  getMorphDecoratorBuilder,
  MorpherManager,
  MorphError,
  MorphParams,
  PropertyParams
} from "./types";
import {BasicMorpherManager, MorphMarshaller} from "./index";
import {getGid} from "../decorator/registry";
import cloneDeep from 'lodash.clonedeep';

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
 */
export const Finalize = (target: any, methodName: string, desc: PropertyDescriptor) => {
  builder.pushMethod(target, methodName, {finalize: methodName}, 'Finalize')
}

/**
 * Method -- if defined, defers all serialization to this method and should have the signature
 * `(morphManager?: MorpherManager<any>)`.
 */
export const Serialize = (target: any, methodName: string, desc: PropertyDescriptor) => {
  builder.pushMethod(target, methodName, {serialize: methodName}, 'Serialize')
}

/**
 * Method -- if defined, defers all deserialization to this method and should have the signature
 * `(source: any, morphManager?: MorpherManager<any>)`.
 */
export const Deserialize = (target: any, methodName: string, desc: PropertyDescriptor) => {
  builder.pushMethod(target, methodName, {deserialize: methodName}, 'Deserialize')
}

export const getMorpherDefinitions = (): DecoratedMorphClass[] => {
  return builder.getFinalized().map(cloneDeep);
}

export const getMorpherDefByGid = (clazzOrGid: any) => {
  if (!clazzOrGid) {
    return;
  }
  const gid = typeof clazzOrGid == 'string' ? clazzOrGid : getGid(clazzOrGid);
  return cloneDeep(builder.getByGid(gid));
}

let morphManager: MorpherManager<MorphMarshaller> = null as any;
let builderChangeTicks = 0;

export const getMorphManager = () => {
  if (!morphManager || builder.getChangeTicks() > builderChangeTicks) {
    builderChangeTicks = builder.getChangeTicks();
    morphManager = new BasicMorpherManager(getMorpherDefinitions());
  }
  return morphManager;
}

export const getMorpherById = (clazzOrGid: any) => {
  return getMorphManager().getByClassOrId(clazzOrGid);
}
