/**
 * A set of helper classes/methods that make it easy to process and collect decorator
 * metadata for reflection.
 */

import { getOrMakeGidForConstructor } from "./registry";
import { DecoratedServiceRecord } from "../service-container/utils";
import { ClassServiceMetadata } from "../service-container/types";

export type DecoratedParameter = {
  method: string;
  pos: number;
};

export enum RecordType {
  all = 1,
  clazz,
  property,
  method,
  parameter,
}

/**
 * Extend metadata with key identifiers that determine scope/context of metadata.
 */
export type MetaDescriptor = {
  _type: RecordType;
  _provider: string;
  _decorator: string;
};

export type DecoratedMethod<
  Method extends any = any,
  Parameter extends any = any
> = {
  metadata: (MetaDescriptor & Method)[];
  parameters: (MetaDescriptor & Parameter)[][];
};

/**
 * A convenient structure encapsulating all class decorations.
 */
export type DecoratedClass<
  Clazz extends any = any,
  Method extends any = any,
  Property extends any = any,
  Parameter extends any = any
> = MetaDescriptor & {
  gid: string;
  clazz: any;
  metadata: (MetaDescriptor & Clazz)[];
  methods: Record<string, DecoratedMethod<Method, Parameter>>;
  staticMethods: Record<string, DecoratedMethod<Method, Parameter>>;
  properties: Record<string, (MetaDescriptor & Property)[]>;
  staticProperties: Record<string, (MetaDescriptor & Property)[]>;
};

/**
 * Generates an empty structure with given gid.
 */
export const getEmptyDecoratedClass = <
  Clazz extends object = any,
  Method extends object = any,
  Parameter extends object = any,
  Property extends object = any
>(
  gid: string,
  provider: string
): DecoratedClass<Clazz, Method, Parameter, Property> => {
  return {
    _type: 0,
    _decorator: "@DecoratedClass",
    _provider: provider,
    gid,
    clazz: undefined,
    metadata: [],
    methods: {},
    staticMethods: {},
    properties: {},
    staticProperties: {},
  };
};

export type BundleIdAccessible = {
  getBundleId(): string;
};

export const hasBundleId = (o: any): o is BundleIdAccessible =>
  typeof o?.getBundleId === "function";

/**
 * Gets the gid of what's assumed to be a class. If `getDecoratorGid()` exists, that value will be
 * returned, otherwise, the class will be
 */
export const getBundleId = (o: any): string | undefined =>
  hasBundleId(o) ? o.getBundleId() : undefined;

let decClassInstances: DecoratedClassBuilder[] = [];
let lastBundleId = "";

/**
 * Returns a decorator that marks class as belonging to bundle identified by id. This allows you to
 * easily group and identify related classes in a module.
 *
 * ```
 * // e.g. setup base decorator for your bundle
 * const MyApp = BundleDecoratorFactory('myapp');
 *
 * @MyApp
 * class Service {}
 * ```
 *
 */
export const BundleDecoratorFactory = (id: string) => {
  return (t: any) => {
    t.getBundleId = () => id;
    // notify each instance that @Bundle was found -- if the given target matches that
    // instance's current clazz, the instance will push the record to the bundle registry
    for (const dci of decClassInstances) {
      dci.bundleDeclared(id, t);
    }
  };
};

export type BundleEntry = {
  id: string;
  metadata: DecoratedClass[];
};

const globalRegistry: Record<string, DecoratedClass[]> = {};

const addToGlobalRegistry = (gid: string, metadata: DecoratedClass) => {
  if (!globalRegistry[gid]) {
    globalRegistry[gid] = [];
  }
  globalRegistry[gid].push(metadata);
};

export const getGlobalDecoratedClasses = (
  filter?: (rec: DecoratedClass) => boolean
): DecoratedClass[] => {
  if (!filter) {
    filter = () => true;
  }

  const list: DecoratedClass[] = [];
  for (const gid of Object.keys(globalRegistry)) {
    list.push(...globalRegistry[gid]);
  }

  return list.filter(filter);
};

const bundleRegistry: Record<string, DecoratedClass[]> = {};
const bundleRegistryGid: Record<string, string[]> = {};

const addToBundleRegistry = (id: string, metadata: DecoratedClass) => {
  if (!bundleRegistry[id]) {
    bundleRegistry[id] = [];
    bundleRegistryGid[id] = [];
  }

  bundleRegistry[id].push(metadata);
  bundleRegistryGid[id].push(metadata.gid);
};

export const getBundledMetadata = (id: string): BundleEntry => {
  if (!bundleRegistry[id]) {
    return { id, metadata: [] };
  }
  return { id, metadata: [...bundleRegistry[id]] };
};

export const getGidsForBundle = (id: string): string[] => {
  if (!bundleRegistryGid[id]) {
    return [];
  }
  return [...bundleRegistryGid[id]];
};

export const getManyBundlesMetadata = (ids: string[]): BundleEntry[] => {
  return ids.map((id) => getBundledMetadata(id));
};

/**
 * Most common use case -- get the metadata of all bundles as a single list.
 */
export const flattenManyBundlesMetadata = (ids: string[]): DecoratedClass[] => {
  return getManyBundlesMetadata(ids)
    .map((m) => m.metadata)
    .reduce((a, b) => a.concat(b), []);
};

/**
 * Given an input list of metadata, only return the ones for specified provider. E.g.
 * `filterMetadataByProvider([{_provider:'http'},{_provider: 'service-container'}], 'http')`
 * returns `[{_provider:'http'}]`
 */
export const filterMetadataByProvider = (metadata: any[], provider: string) => {
  return metadata.filter(
    (m) => m.provider == provider || m._provider == provider
  );
};

export const filterByDecorator = (metadata: any[], decorator: string) => {
  return metadata.filter(
    (m) => m.decorator == decorator || m._decorator == decorator
  );
};

export const duplicateDecoratorsForGid = (gid: string, newGid: string) => {};

/**
 * Iteratively construct a class tree of decorators for easy in-process and post-
 * process introspection. This is a concrete and easy-to-work-with alternative
 * to reflect-metadata with extra benefits (e.g. annotation libs can expose
 * their metadata via gid).
 *
 * This also populates the global registry as well as bundle registry, which you
 * can access from the above exposed methods.
 */
export class DecoratedClassBuilder<
  Clazz extends object = any,
  Method extends object = any,
  Parameter extends object = any,
  Property extends object = any
> {
  curGid = "";
  cur: DecoratedClass = getEmptyDecoratedClass<
    Clazz,
    Method,
    Property,
    Parameter
  >("", "");

  private finalized: DecoratedClass[] = [];
  private map: Record<string, DecoratedClass> = {};
  private provider: string;
  private changeTicks = 0;

  constructor(provider: string) {
    this.provider = provider;
    decClassInstances.push(this);
  }

  getChangeTicks() {
    return this.changeTicks;
  }

  protected checkProto(proto: any) {
    this.changeTicks++;
    const gid = getOrMakeGidForConstructor(proto);
    if (this.curGid != gid) {
      this.cur = getEmptyDecoratedClass<Clazz, Method, Property, Parameter>(
        gid,
        this.provider
      );
      this.curGid = gid;

      // technically this should be done before next class starts getting processed,
      // but by doing this upfront (and using the reference to the current meta), we
      // can avoid boilerplate that needs to process the last seen class (since there's
      // no decorator-end event, we'd have to manually do this).
      this.finalized.push(this.cur);
      this.map[gid] = this.cur;
      addToGlobalRegistry(gid, this.cur);
    }
  }

  getByGid(gid: string) {
    return this.map[gid];
  }

  initProperty(
    name: string,
    isStatic: boolean,
    metadata: Property,
    decorator: string
  ) {
    const target = isStatic ? this.cur.staticProperties : this.cur.properties;
    if (!target[name]) {
      target[name] = [];
    }

    target[name].push({
      ...metadata,
      _type: RecordType.property,
      _provider: this.provider,
      _decorator: decorator,
    });
  }

  pushProperty(proto: any, name: string, metadata: Property, decorator = "") {
    const isStatic = !!proto.prototype;
    this.checkProto(proto);
    this.initProperty(name, isStatic, metadata, decorator);
  }

  initMethod(name: string, isStatic: boolean) {
    const target = isStatic ? this.cur.staticMethods : this.cur.methods;
    if (!target[name]) {
      target[name] = {
        metadata: [],
        parameters: [],
      };
    }
  }

  pushMethod(proto: any, name: string, metadata: Method, decorator = "") {
    const isStatic = !!proto.prototype;
    this.checkProto(proto);
    this.initMethod(name, isStatic);
    const meta = {
      ...metadata,
      _type: RecordType.method,
      _provider: this.provider,
      _decorator: decorator,
    };
    if (isStatic) {
      this.cur.staticMethods[name].metadata.push(meta);
    } else {
      this.cur.methods[name].metadata.push(meta);
    }
  }

  initParameter(methodName: string, pos: number, isStatic: boolean) {
    this.initMethod(methodName, isStatic);
    const target = isStatic ? this.cur.staticMethods : this.cur.methods;
    if (!target[methodName].parameters[pos]) {
      target[methodName].parameters[pos] = [];
    }
  }

  pushParameter(
    proto: any,
    methodName: string,
    pos: number,
    metadata: Parameter,
    decorator = ""
  ) {
    const isStatic = !!proto.prototype;
    this.checkProto(proto);
    this.initParameter(methodName, pos, isStatic);
    const target = isStatic ? this.cur.staticMethods : this.cur.methods;
    target[methodName].parameters[pos].push({
      ...metadata,
      _type: RecordType.parameter,
      _provider: this.provider,
      _decorator: decorator,
    });
  }

  pushClass(clazz: any, metadata: Clazz, decorator = "") {
    this.checkProto(clazz);
    this.cur.clazz = clazz;
    this.cur.metadata.push({
      ...metadata,
      _type: RecordType.clazz,
      _provider: this.provider,
      _decorator: decorator,
    });
  }

  getFinalized(): DecoratedClass<Clazz, Method, Parameter, Property>[] {
    return [...this.finalized];
  }

  bundleDeclared(id: string, t: any) {
    if (this.cur.clazz === t) {
      addToBundleRegistry(id, this.cur);
    }
  }
}
