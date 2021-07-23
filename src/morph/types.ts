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
  name?: string;
  validate?: ValidatorFn;
}
