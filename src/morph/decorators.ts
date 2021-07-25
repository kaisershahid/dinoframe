import {
  getMorphDecoratorBuilder,
  MorphError,
  MorphParams,
  ObjectError,
  PropertyParams
} from "./types";
import {Morpher} from "./morpher";
import {getGid, swapConstructorWithSubclass} from "../decorator/registry";

const builder = getMorphDecoratorBuilder();

/**
 */
export const Morph = (params: MorphParams = {}) => {
  return (target: any) => {
    if (params.discriminator) {
      // attach static factory for discrminator matching
      const discriminatorCol = params.discriminator;
      target.___discriminatorCol = discriminatorCol;
      target.___discriminatorMap = {};
      target.___getInstanceForDiscriminatorValue = (dvalue: any) => {
        if (!target.___discriminatorMap[dvalue]) {
          throw new ObjectError(target.name, {
            [discriminatorCol]: `cannot convert discriminator value to class: ${dvalue}`
          })
        }
      }
    }

    builder.pushClass(target, {...params}, 'Morph');

    if (params.inherits) {
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

/**
 * Method -- if defined, the method is invoked after deserialization to allow any necessary cleanup
 * steps and also do more complex validation. If instance fails deserialization, should throw
 * `ObjectError`
 * @todo
 */
export const Validate = () => {
  return (target: any, name: string, desc: PropertyDescriptor) => {

  }
}

/**
 * Method -- if defined, defers all serialization to this method.
 * @todo
 */
export const Serialize = () => {
  return (target: any, name: string, desc: PropertyDescriptor) => {

  }
}

/**
 * Method -- if defined, defers all deserialization to this method and should have the signature
 * `(source: any)`.
 * @todo
 */
export const Deserialize = () => {
  return (target: any, name: string, desc: PropertyDescriptor) => {

  }
}

export const getMorphDefinitions = () => {
  return builder.getFinalized();
}

export const getMorphTransformers = () => {
  return getMorphDefinitions().map(r => new Morpher(r
  ))
}

export const getMorphDefByGid = (clazz: any) => {
  const gid = getGid(clazz);
  return builder.getByGid(gid);;
}


export const getTransformerByGid = (clazz: any) => {
  const meta = getMorphDefByGid(clazz);
  return meta ? new Morpher(meta) : undefined;
}
