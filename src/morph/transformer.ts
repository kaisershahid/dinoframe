import {DecoratedMorphClass, ObjectError, TransformerPropertyDef} from "./types";

export class TransformerError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class Transformer {
  private clazz: any;
  private originalMeta: DecoratedMorphClass;
  propertyDefs: Record<string, TransformerPropertyDef> = {};

  constructor(decoratedMeta: DecoratedMorphClass) {
    this.originalMeta = decoratedMeta;
    this.clazz = decoratedMeta.clazz;
    this.init();
  }

  private init() {
    this.initProperties();
    this.initMethods();
  }

  canHandle(clazz: any) {
    return this.clazz === clazz;
  }

  private initProperties() {
    for (const propertyName in this.originalMeta.properties) {
      const {name, validator} = this.originalMeta.properties[propertyName][0];
      this.updateProperty(name, {propertyName, validator});
    }
  }

  private initMethods() {
    for (const method of Object.values(this.originalMeta.methods)) {
      const def = method.metadata[0];
      this.updateProperty(def.name, def);
    }
  }

  private updateProperty(name: string, def: Partial<TransformerPropertyDef>) {
    if (!this.propertyDefs[name]) {
      this.propertyDefs[name] = {name}
    }

    this.propertyDefs[name] = {...this.propertyDefs[name], ...def}
  }

  deserialize<T extends any = any>(source: any): T {
    const inst = (new this.clazz()) as T;
    const errors: Record<string, any> = {};
    let errCount = 0;

    // @todo support '*' name
    for (const name in this.propertyDefs) {
      const def = this.propertyDefs[name];
      const val = source[name];

      // assumes name key not present, so skip (but check required first)
      if (val === undefined || val === null) {
        if (def.required) {
          errors[name] = {message: 'required'};
          errCount++;
        }
        continue;
      }

      // @todo cast to type if defined

      if (def.setter) {
        inst[def.setter](val);
      } else if (def.propertyName) {
        if (def.validator) {
          const valError = def.validator(val, name);
          if (valError) {
            errors[name] = valError;
            errCount++;
          }
          continue;
        } else if (def.required) {
          // @todo need type-specific?
          if (val === '' || isNaN(val)) {
            errors[name] = {message: 'required'};
            errCount++;
            continue;
          }
        }

        inst[def.propertyName] = val;
      } else {
        throw new TransformerError(`deserialize(${this.clazz.name}): ${name} does not have property/setter defined`)
      }

      // @todo check if val is complex and serialize further
    }

    if (errCount > 0) {
      throw new ObjectError(this.clazz.name, errors);
    }

    // @todo @Validate if exists

    return inst;
  }

  serialize(source: any): any {
    const map: any = {};

    for (const name in this.propertyDefs) {
      const def = this.propertyDefs[name];
      let val: any;
      if (def.getter) {
        val = source[def.getter]();
      } else if (def.propertyName) {
        val = source[def.propertyName];
      } else {
        // @todo exception?
      }

      // @todo check if val is complex and serialize further
      map[name] = val;
    }

    return map;
  }
}
