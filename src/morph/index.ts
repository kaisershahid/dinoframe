import {
  DecoratedMorphClass,
  FieldError,
  Morpher,
  MorpherManager,
  MorphError,
  ObjectError,
  TransformerPropertyDef, TransormerPropertyOverridesMap,
} from "./types";
import { getGid } from "../decorator/registry";

export const NAME_CATCH_ALL = "*";

export class MorphMarshaller<Manager extends MorpherManager<any> = any>
  implements Morpher
{
  private manager: Manager;
  private clazz: any;
  private baseClass: any;
  private originalMeta: DecoratedMorphClass;

  propertyDefs: Record<string, TransformerPropertyDef> = {};
  discriminatorCol = "";
  subclasses: Record<string, typeof Function> = {};
  ignoreProps: string[] = [];
  finalizeMethod?: string;
  serializeMethod?: string;
  deserializeMethod?: string;

  constructor(decoratedMeta: DecoratedMorphClass, manager: Manager) {
    this.manager = manager;
    this.originalMeta = decoratedMeta;
    this.clazz = decoratedMeta.clazz;

    const morphMeta = decoratedMeta.metadata[0];
    this.ignoreProps = morphMeta.ignoreProps ?? [];
    // a base class without discriminatorValue means we apply parent's decorators too
    if (
      morphMeta.inherits?.baseClass &&
      !morphMeta.inherits.discriminatorValue
    ) {
      this.baseClass = morphMeta.inherits.baseClass;
    }

    if (this.clazz.___discriminatorMap) {
      this.discriminatorCol = this.clazz.___discriminatorCol;
      this.subclasses = { ...this.clazz.___discriminatorMap };
    }
    this.init();
  }

  getGid() {
    return this.originalMeta.gid;
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
      const { name, ...rest } = this.originalMeta.properties[propertyName][0];
      this.updateProperty(name, rest);
    }
  }

  private initMethods() {
    for (const method of Object.values(this.originalMeta.methods)) {
      const def = method.metadata[0];
      if (def.finalize) {
        this.finalizeMethod = def.finalize;
      } else if (def.serialize) {
        this.serializeMethod = def.serialize;
      } else if (def.deserialize) {
        this.deserializeMethod = def.deserialize;
      } else {
        this.updateProperty(def.name, def);
      }
    }
  }

  private updateProperty(name: string, def: Partial<TransformerPropertyDef>) {
    if (!this.propertyDefs[name]) {
      this.propertyDefs[name] = { name };
    }

    this.propertyDefs[name] = { ...this.propertyDefs[name], ...def };
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
        throw new MorphError(
          `${this.clazz.name}: could not map ${
            this.clazz.___discriminatorCol
          }=${source[this.clazz.___discriminatorCol]} to a subclass: ${
            err.message
          }`
        );
      }
    } else {
      return [new this.clazz(), null];
    }
  }

  doSetValue(
    inst: any,
    val: any,
    def: TransformerPropertyDef,
    errors: Record<string, any>
  ) {
    const name = def.name;
    // assumes name key not present, so skip (but check required first)
    if (val === undefined || val === null) {
      if (def.required) {
        errors[name] = { message: "required" };
      }
      return;
    }

    if (typeof def.type == "function") {
      if (val instanceof Array) {
        val = val.map((v) =>
          this.deserializeNested(v, def.type as typeof Function)
        );
      } else {
        val = this.deserializeNested(val, def.type as typeof Function);
      }
    } else {
      try {
        ValueFactory.validateValue(val, def);
      } catch (e) {
        errors[name] = e;
      }
    }

    if (def.setter) {
      try {
        inst[def.setter](val);
      } catch (err) {
        errors[name] = { message: err.message, exception: err };
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
        if (val === "" || val === null) {
          errors[name] = { message: "required" };
          return;
        }
      }

      inst[def.propertyName] = val;
    }
  }

  doDeserialize<T extends any = any>(inst: any, source: any, overrides: TransormerPropertyOverridesMap): T {
    const errors: Record<string, any> = {};

    let catchAllDef: TransformerPropertyDef = null as any;
    const keysProcessed: Record<string, string> = {};

    for (const name in this.propertyDefs) {
      const def = {...this.propertyDefs[name], ...(overrides[name] ?? {})};
      if (name == NAME_CATCH_ALL) {
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

    if (this.finalizeMethod) {
      inst[this.finalizeMethod]();
    }

    return inst;
  }

  getAncestorStack(): MorphMarshaller<Manager>[] {
    const mstack: MorphMarshaller<Manager>[] = [this];
    let t = this.manager.getByClassOrId(this.baseClass);
    while (t) {
      mstack.unshift(t);
      t = this.manager.getByClassOrId(t.baseClass);
    }
    return mstack;
  }

  /**
   * Build morpher stack and apply from highest to lowest
   */
  deserializeAncestors(inst: any, source: any, overrides: TransormerPropertyOverridesMap) {
    const mstack = this.getAncestorStack();
    for (const tr of mstack) {
      tr.doDeserialize(inst, source, overrides);
    }
  }

  deserialize<T extends any = any>(source: any, overrides?: TransormerPropertyOverridesMap): T {
    const [inst, subclass] = this.makeInstance(source) as [T, any];
    let ovr = overrides ?? {};

    if (this.deserializeMethod) {
      inst[this.deserializeMethod](source, this.manager);
      return inst;
    }

    if (this.baseClass) {
      this.deserializeAncestors(inst, source, ovr);
    } else {
      this.doDeserialize(inst, source, ovr);
    }

    if (subclass) {
      // continue populating using subclass rules
      const subtransformer = this.manager.getByClassOrId(subclass);
      subtransformer?.doDeserialize(inst, source, ovr);
    }

    return inst;
  }

  doSerialize(map: any, source: any, overrides: TransormerPropertyOverridesMap) {
    let catchAllDef: TransformerPropertyDef = null as any;

    for (const name in this.propertyDefs) {
      if (name == NAME_CATCH_ALL) {
        catchAllDef = this.propertyDefs[name];
        continue;
      }

      const def = {...this.propertyDefs[name], ...(overrides[name] ?? {})};
      let val: any;
      if (def.getter) {
        val = source[def.getter]();
      } else if (def.propertyName) {
        val = source[def.propertyName];
      }

      if (typeof def.type == "function") {
        if (val instanceof Array) {
          val = val.map((v) =>
            this.serializeNested(v, def.type as typeof Function)
          );
        } else {
          val = this.serializeNested(val, def.type as typeof Function);
        }
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
  }

  serializeAncestors(map: any, source: any, overrides: TransormerPropertyOverridesMap) {
    const mstack = this.getAncestorStack();
    for (const t of mstack) {
      t.doSerialize(map, source, overrides);
    }
  }

  serialize(source: any, overrides?: TransormerPropertyOverridesMap): any {
    const map: any = {};
    let ovr = overrides ?? {};

    // @question pass ovr to serializeMethod?
    if (this.serializeMethod) {
      return source[this.serializeMethod](this.manager);
    }

    if (this.baseClass) {
      this.serializeAncestors(map, source, ovr);
    } else {
      this.doSerialize(map, source, ovr);
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
    const transformer = this.manager.getByClassOrId(clazz);
    if (transformer) {
      return transformer.deserialize(val);
    } else {
      // @todo pojoTransformer?
      return val;
    }
  }

  private serializeNested(val: any, clazz: typeof Function) {
    const transformer = this.manager.getByClassOrId(clazz);
    if (transformer) {
      return transformer.serialize(val);
    } else {
      // @todo pojoSerialize?
      return null;
    }
  }
}

export class ValueFactory {
  static validateValue(val: any, def: TransformerPropertyDef) {
    if (def.listType == "strict" && !(val instanceof Array)) {
      throw new FieldError(`listType=strict, ${typeof val} given`);
    }

    if (val instanceof Array) {
      if (!def.listType) {
        throw new FieldError(`listType=none, array given`);
      }

      let errors: any = {};
      let err = 0;
      for (let i = 0; i < val.length; i++) {
        try {
          this.assertProperType(val[i], def);
        } catch (e) {
          errors[i] = e.message;
          err++;
        }
      }

      if (err) {
        throw new FieldError(`one or more errors: ${JSON.stringify(errors)}`);
      }
    } else {
      this.assertProperType(val, def);
    }
  }

  static assertProperType(val: any, def: TransformerPropertyDef) {
    switch (def.type) {
      case "boolean":
        if (typeof val != "boolean") {
          throw new FieldError(`not a boolean: ${JSON.stringify(val)}`);
        }
        break;
      case "string":
        if (typeof val != "string") {
          throw new FieldError(`not a string: ${JSON.stringify(val)}`);
        }
        break;
      case "number":
        if (typeof val != "number") {
          throw new FieldError(`not a number: ${JSON.stringify(val)}`);
        }
        break;
      case "enum":
        if (!def.enumValues?.includes(val)) {
          throw new FieldError(
            `${val} does not match any enum values: [${def.enumValues?.join(
              "; "
            )}]`
          );
        }
        break;
    }
  }
}

export class BasicMorpherManager implements MorpherManager<MorphMarshaller> {
  private morphers: Record<string, MorphMarshaller<any>> = {};

  constructor(morphMeta: DecoratedMorphClass[] = []) {
    for (const m of morphMeta) {
      this.morphers[m.gid] = new MorphMarshaller<any>(m, this);
    }
  }

  getByClassOrId(
    clazzOrId: any
  ): MorphMarshaller<BasicMorpherManager> | undefined {
    if (!clazzOrId) {
      return;
    }
    const gid = typeof clazzOrId == "string" ? clazzOrId : getGid(clazzOrId);
    return this.morphers[gid];
  }

  deserializeTo<T extends any = any>(source: any, clazz: any): T {
    const m = this.getByClassOrId(clazz);
    if (!m) {
      throw new MorphError(`deserialize: no morpher for ${clazz.name}`);
    }

    return m.deserialize(source);
  }

  serializeFrom<T extends any = any>(source: any): Record<string, any> {
    const m = this.getByClassOrId(Object.getPrototypeOf(source));
    if (!m) {
      throw new MorphError(`serialize: no morpher for ${source}`);
    }

    return m.serialize(source);
  }
}
