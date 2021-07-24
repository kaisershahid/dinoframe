import {DecoratedClass, DecoratedClassBuilder} from "../decorator";

export const MORPH_PROVIDER = 'dinoframe.morph';

export class FieldError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class ObjectError extends Error {
  fieldErrors: Record<string, any>;
  constructor(targetName: string, errors: Record<string, any>) {
    super(`One or more errors for: ${targetName}`);
    this.fieldErrors = errors;
  }
}

export type ValidatorError = {

};

export type ValidatorFn = (value: any, name: string) => ValidatorError|undefined;

export type PropertyParams = {
  /**
   * The public name of this property. E.g. `{title}`
   */
  name: string;
  propertyName?: string;
  validator?: ValidatorFn;
}

export type MethodParams = {
  name: string;
  setter?: string;
  getter?: string;
}

export type TransformerPropertyDef = PropertyParams & MethodParams;

export type DecoratedMorphClass = DecoratedClass<any, MethodParams, PropertyParams>;

export const getMorphDecoratorBuilder = () => {
  return new DecoratedClassBuilder(MORPH_PROVIDER);
}
