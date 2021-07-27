import {DecoratedClass, DecoratedClassBuilder} from "../decorator";

export const MORPH_PROVIDER = 'dinoframe.morph';

export class MorphError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class FieldError extends MorphError {
  constructor(message: string) {
    super(message);
  }
}

export class ObjectError extends MorphError {
  fieldErrors: Record<string, any>;

  constructor(targetName: string, errors: Record<string, any>) {
    super(`One or more errors for: ${targetName}`);
    this.fieldErrors = errors;
  }
}

export type ValidatorErrorMap = {
  message: string;
  [key: string]: any;
};

export type ValidatorFn = (value: any, name: string) => ValidatorErrorMap | undefined;

export type MorphParams = {
  /**
   * Indicates the class is polymorphic and defines the property name that
   * determines the final class.
   */
  discriminator?: string;
  /**
   * For subclasses in general, defines which parent class this class belongs to.
   * If the subclass is used for polymorphism, the discriminatorValue must also
   * be defined to properly associate it.
   */
  inherits?: {
    baseClass?: any;
    discriminatorValue?: string;
  }
  /**
   * If defined and not empty, omit specific properties from serialization.
   * This does not affect deserialization (i.e. you can mark a property to
   * be populated from some map but ensure it doesn't get put back into a
   * map).
   *
   * When used with polymorphism, the `ignoreProps` at each level is used to
   * filter out keys. E.g. if parent class Parent ignores ['key1'] and Child
   * ignores ['key2'], and raw serialization for Parent={key2: 'parentVal'}
   * and Child={key1: 'childKey1', key2: 'childVal'}, the final serialized
   * value would be: {key1: 'childKey1', key2: 'parentVal'}.
   */
  ignoreProps?: string[];
}

/**
 * For direct property setting, the following metadata can be specified to help
 * manage the lifecycle of the value.
 */
export type PropertyParams = {
  /**
   * The public name of this property. E.g. `title`
   */
  name: string;
  /**
   * The instance property to set the source value on.
   */
  propertyName?: string;
  /**
   * The callback function to invoke before setting.
   */
  validator?: ValidatorFn;
  /**
   * Requires key to be present and not empty based on type:
   */
  required?: boolean;
  /**
   * If specified, either validates scalar value against type or deserializes
   * value to the given class constructor.
   * @future 'object'
   */
  type?: 'boolean' | 'string' | 'number' | 'enum' | Function;
  /**
   * If defined, either allows array or scalar ('mixed') or strictly array ('strict')
   */
  listType?: 'mixed' | 'strict'
  /**
   * For enum type, the list of allowed values.
   */
  enumValues?: any[];
}

export type MethodParams = {
  /**
   * The public name of the property (e.g. 'title'). Only matters for setter/getter.
   */
  name: string;
  /**
   * Name of method to set value with. Expects 1 argument. Can throw FieldError.
   */
  setter?: string;
  /**
   * Name of getter for value. Expects 0 arguments.
   */
  getter?: string;
  /**
   * After all properties are set, invokes method for final setup and/or complex validation
   * (throw ObjectError in this case).
   */
  finalize?: string;
  /**
   * Defers all serialization to method.
   */
  serialize?: string;
  /**
   * Defers all deserialization to method. Expects 1 argument (source value map).
   */
  deserialize?: string;
}

export type TransformerPropertyDef = PropertyParams & MethodParams;

export type DecoratedMorphClass = DecoratedClass<MorphParams, MethodParams, PropertyParams>;

export const getMorphDecoratorBuilder = () => {
  return new DecoratedClassBuilder(MORPH_PROVIDER);
}

export interface Morpher {
  deserialize<T extends any = any>(source: any): T;
  serialize<T extends any = any>(source: any): Record<string, any>;
}

export interface MorpherManager<MorpherType extends Morpher> {
  deserializeTo<T extends any = any>(source: any, clazz: any): T;
  serializeFrom<T extends any = any>(source: any): Record<string, any>;
  getByClassOrId(clazzOrId: any): MorpherType|undefined;
}
