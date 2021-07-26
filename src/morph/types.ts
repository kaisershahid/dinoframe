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
   * For subclasses of the polymorphic type, defines which parent class it belongs
   * to and what the discriminator value should be.
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

export type PropertyParams = {
  /**
   * The public name of this property. E.g. `{title}`
   */
  name: string;
  propertyName?: string;
  validator?: ValidatorFn;
  /**
   * Requires key to be present and not empty based on type:
   */
  required?: boolean;
  type?: 'boolean' | 'string' | 'number' | 'enum' | Function;
  enumValues?: any[];
}

export type MethodParams = {
  name: string;
  setter?: string;
  getter?: string;
  finalize?: string;
}

export type TransformerPropertyDef = PropertyParams & MethodParams;

export type DecoratedMorphClass = DecoratedClass<MorphParams, MethodParams, PropertyParams>;

export const getMorphDecoratorBuilder = () => {
  return new DecoratedClassBuilder(MORPH_PROVIDER);
}
