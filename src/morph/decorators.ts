import {getMorphDecoratorBuilder, PropertyParams} from "./types";
import {Transformer} from "./transformer";
import {getGid} from "../decorator/registry";

const builder = getMorphDecoratorBuilder();

/**
 * @todo need discriminator/polymorph support
 */
export const Morph = () => {
  return (target: any) => {
    builder.pushClass(target, {}, 'Morph');
  }
}

/**
 * @todo need complex type hinting
 */
export const Property = (params: Partial<PropertyParams> = {}) => {
  return (target: any, name: string) => {
    builder.pushProperty(target, name, {name, ...params, propertyName: name}, 'Property');
  }
}

export const PropertySet = (name: string) => {
  return (target: any, methodName: string, desc: PropertyDescriptor) => {
    builder.pushMethod(target, methodName, {name, setter: methodName}, 'PropertySet')
  }
}

export const PropertyGet = (name: string) => {
  return (target: any, methodName: string, desc: PropertyDescriptor) => {
    builder.pushMethod(target, methodName, {name, getter: methodName}, 'PropertyGet')
  }
}

export const Validate = () => {
  return (target: any, name: string, desc: PropertyDescriptor) => {

  }
}


export const getMorphDefinitions = () => {
  return builder.getFinalized();
}

export const getMorphTransformers = () => {
  return getMorphDefinitions().map(r => new Transformer(r
  ))
}

export const getTransformerByGid = (clazz: any) => {
  const gid = getGid(clazz);
  const meta = builder.getByGid(gid);
  return meta ? new Transformer(meta) : undefined;
}
