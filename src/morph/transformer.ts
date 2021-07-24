import {DecoratedMorphClass, ObjectError, TransformerPropertyDef} from "./types";
import {getTransformerByGid} from "./decorators";

export const NAME_CATCH_ALL = '*';

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

    let catchAllDef: TransformerPropertyDef = null as any;
    const keysProcessed: Record<string, string> = {};

    const doSet = (inst: any, val: any, def: TransformerPropertyDef) => {
      const name = def.name;
      // assumes name key not present, so skip (but check required first)
      if (val === undefined || val === null) {
        if (def.required) {
          errors[name] = {message: 'required'};
        }
        return;
      }

      // @todo cast to type if defined

      if (typeof def.type == 'function') {
        val = this.deserializeNested(val, def.type as typeof Function);
      }

      if (def.setter) {
        try {
          inst[def.setter](val);
        } catch (err) {
          errors[name] = {message: err.message, exception: err};
          return;
        }
      } else if (def.propertyName) {
        if (def.validator) {
          const valError = def.validator(val, name);
          if (valError) {
            errors[name] = valError;
            return;
          }
        } else if (def.required) {
          // @todo need type-specific?
          if (val === '' || isNaN(val)) {
            errors[name] = {message: 'required'};
            return;
          }
        }

        inst[def.propertyName] = val;
      } else {
        throw new TransformerError(`deserialize(${this.clazz.name}): ${name} does not have property/setter defined`)
      }
    }

    for (const name in this.propertyDefs) {
      const def = this.propertyDefs[name];
      if (name == '*') {
        catchAllDef = def;
        continue;
      }

      let val = source[name];
      keysProcessed[name] = name;

      doSet(inst, val, def);

      // @todo check if val is complex and serialize further
    }

    if (catchAllDef) {
      let subset: any = {};
      for (const key in source) {
        if (!keysProcessed[key]) {
          subset[key] = source[key];
        }
      }
      doSet(inst, subset, catchAllDef);
    }


    if (Object.keys(errors).length > 0) {
      throw new ObjectError(this.clazz.name, errors);
    }

    // @todo @Validate if exists

    return inst;
  }

  serialize(source: any): any {
    const map: any = {};
    let catchAllDef: TransformerPropertyDef = null as any;

    for (const name in this.propertyDefs) {
      if (name == '*') {
        catchAllDef = this.propertyDefs[name];
        continue;
      }

      const def = this.propertyDefs[name];
      let val: any;
      if (def.getter) {
        val = source[def.getter]();
      } else if (def.propertyName) {
        val = source[def.propertyName];
      } else {
        // @todo exception?
      }

      if (typeof def.type == 'function') {
        val = this.serializeNested(val, def.type as typeof Function);
      }

      map[name] = val;
    }

    if (catchAllDef) {
      let subset: any = {};
      if (catchAllDef.getter) {
        subset = source[catchAllDef.getter];
      } else if (catchAllDef.propertyName) {
        subset = source[catchAllDef.propertyName];
      }
      for (const key in subset) {
        map[key] = subset[key];
      }
    }

    return map;
  }

  private deserializeNested(val: any, clazz: typeof Function) {
    const transformer = getTransformerByGid(clazz);
    if (transformer) {
      return transformer.deserialize(val);
    } else {
      // @todo pojoTransformer?
      return val;
    }
  }

  private serializeNested(val: any, clazz: typeof Function) {
    const transformer = getTransformerByGid(clazz);
    if (transformer) {
      return transformer.serialize(val);
    } else {
      return null;
    }
  }
}
