import {DecoratedMorphClass, MorphError, ObjectError, TransformerPropertyDef} from "./types";
import {getMorphDefByGid, getTransformerByGid} from "./decorators";
import cloneDeep from 'lodash.clonedeep';

export const NAME_CATCH_ALL = '*';

export class MorpherError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class Morpher {
  private clazz: any;
  private originalMeta: DecoratedMorphClass;
  propertyDefs: Record<string, TransformerPropertyDef> = {};
  discriminatorCol = '';
  subclasses: Record<string, typeof Function> = {};
  ignoreProps: string[] = [];

  constructor(decoratedMeta: DecoratedMorphClass) {
    this.originalMeta = decoratedMeta;
    this.clazz = decoratedMeta.clazz;
    this.ignoreProps = decoratedMeta.metadata[0].ignoreProps ?? [];
    if (this.clazz.___discriminatorMap) {
      this.discriminatorCol = this.clazz.___discriminatorCol;
      this.subclasses = {...this.clazz.___discriminatorMap};
    }
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

  /**
   * Returns either an instance of the current class or, if polymorphism is
   * detected, attempts to return a subclass instance.
   * @return The effective instance along with its subclass constructor (optional)
   */
  makeInstance(source: any): any {
    if (this.discriminatorCol) {
      try {
        const dvalue = source[this.discriminatorCol];
        const subclass = this.subclasses[dvalue];
        return [new subclass(), subclass];
      } catch (err) {
        throw new MorphError(`${this.clazz.name}: could not map ${this.clazz.___discriminatorCol}=${source[this.clazz.___discriminatorCol]} to a subclass: ${err.message}`);
      }
    } else {
      return [new this.clazz(), null];
    }
  }

  doSetValue(inst: any, val: any, def: TransformerPropertyDef, errors: Record<string, any>) {
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
    }
    // we currently don't throw for missing setter since this may happen with polymorph
  }

  doDeserialize<T extends any = any>(inst: any, source: any): T {
    const errors: Record<string, any> = {};

    let catchAllDef: TransformerPropertyDef = null as any;
    const keysProcessed: Record<string, string> = {};

    for (const name in this.propertyDefs) {
      const def = this.propertyDefs[name];
      if (name == '*') {
        catchAllDef = def;
        continue;
      }

      let val = source[name];
      keysProcessed[name] = name;

      this.doSetValue(inst, val, def, errors);
    }

    if (catchAllDef) {
      let subset: any = {};
      for (const key in source) {
        if (!keysProcessed[key]) {
          subset[key] = source[key];
        }
      }
      this.doSetValue(inst, subset, catchAllDef, errors);
    }

    if (Object.keys(errors).length > 0) {
      throw new ObjectError(this.clazz.name, errors);
    }

    // @todo @Validate if exists

    return inst;
  }

  deserialize<T extends any = any>(source: any): T {
    const [inst, subclass] = this.makeInstance(source) as [T, any];
    this.doDeserialize(inst, source);

    if (subclass) {
      // continue populating using subclass rules
      const subtransformer = getTransformerByGid(subclass);
      subtransformer?.doDeserialize(inst, source);
    }

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

    for (const ignoreProp of this.ignoreProps) {
      delete map[ignoreProp];
    }

    if (this.discriminatorCol) {
      // serialize and copy non-undefined values into map if polymorph
      const subclass = this.subclasses[map[this.discriminatorCol]];
      if (subclass) {
        const subclassSer = this.serializeNested(source, subclass);
        for (const _key in subclassSer) {
          const subVal = subclassSer[_key];
          // case: PropertySet defined on subclass but not PropertyGet
          if (subVal !== undefined) {
            map[_key] = subVal;
          }
        }
      }
      // @todo else exception?
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
      // @todo pojoSerialize?
      return null;
    }
  }
}
