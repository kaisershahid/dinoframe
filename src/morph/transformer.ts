import {DecoratedMorphClass, TransformerPropertyDef} from "./types";

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

    for (const name in this.propertyDefs) {
      const def = this.propertyDefs[name];
      const val = source[name];
      if (def.setter) {
        inst[def.setter](val);
      } else if (def.propertyName) {
        inst[def.propertyName] = val;
      } else {
        // @todo exception
      }

      // @todo check if val is complex and serialize further
    }

    // @todo validate if exists

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
