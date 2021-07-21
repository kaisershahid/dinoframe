import {
  ClassServiceMetadata,
  DependencyMeta,
  InjectableList,
  MethodInvoker,
  MethodType,
  ServiceMeta,
  ServiceRecord,
  ServiceState
} from "./types";
import {
  DecoratedClass,
  DecoratedClassBuilder,
  DecoratedMethod,
  getGidsForBundle
} from "../decorator";
import {getDecoratedServiceRecords} from "./decorators";
import cloneDeep from 'lodash.clonedeep';
import {getOrMakeGidForConstructor} from "../decorator/registry";

/**
 * Normalizes DecoratedClass metadata.
 */
export class DecoratedServiceRecord implements ServiceRecord {
  originalMeta: ClassServiceMetadata;
  provider: string = '';
  id: string = "";
  gid: string = "";
  priority = 0;
  clazz: any;
  isDisabled?: boolean;
  isFactory?: boolean;
  injectConfig: string = '';
  config?: Record<string, any>;
  interfaces: string[] = [];
  status: ServiceState = ServiceState.registered;
  factory = "";
  injectableFactory: InjectableList = [];
  activator = "";
  deactivator = "";
  dependencies: Record<string, DependencyMeta["matchCriteria"]> = {};
  injectableMethods: Record<string, InjectableList> = {};
  subscribeToInterfaces: string[] = [];

  constructor(classMeta: DecoratedClass) {
    this.originalMeta = classMeta;
    this.initFromDecoratedClass(classMeta);
  }

  private initFromDecoratedClass(classMeta: DecoratedClass<ServiceMeta>) {
    if (classMeta.metadata.length != 1) {
      throw new Error(
        `expected exactly 1 decoration, got: ${classMeta.metadata.length}`
      );
    }

    this.provider = classMeta._provider;
    this.id = classMeta.metadata[0].id;
    this.gid = classMeta.metadata[0].gid;
    this.isDisabled = classMeta.metadata[0].disabled;
    this.isFactory = classMeta.metadata[0].isFactory;
    this.config = classMeta.metadata[0].config;

    const ic = classMeta.metadata[0].injectConfig;
    if (ic) {
      this.injectConfig = ic === true ? makeConfigId(this.id) : ic;
      this.dependencies[this.injectConfig] = {};
    }
    this.clazz = classMeta.clazz;
    this.priority = classMeta.metadata[0].priority ?? 0;
    this.interfaces = classMeta.metadata[0].interfaces ?? [];
    this.subscribeToInterfaces = classMeta.metadata[0].subscribeToInterfaces ?? [];

    this.processMethods(classMeta.methods);
    this.processMethods(classMeta.staticMethods, true);
  }

  private processMethods(
    methods: Record<string, DecoratedMethod>,
    isStatic = false
  ) {
    for (const methodName of Object.keys(methods)) {
      const mrec = methods[methodName];
      const params = mrec.parameters.map((params) => {
        if (params) {
          if (params[0].id) {
            this.dependencies[params[0].id] = {};
          }
          if (params[0].matchInterface) {
            this.dependencies["#" + params[0].matchInterface] = params[0]
              .matchCriteria ?? {min: 1};
          }
          return params[0];
        }
        return undefined;
      });

      // regular setter methods have no metadata on method, only params
      switch (mrec.metadata[0]?.type) {
        case MethodType.activate:
          this.activator = methodName;
          break;
        case MethodType.deactivate:
          this.deactivator = methodName;
          break;
        case MethodType.factory:
          // expecting 1 injectable decorator per param
          this.factory = methodName;
          this.injectableFactory = params;
          break;
        default:
          this.injectableMethods[methodName] = params;
      }
    }
  }

  clone(override: ServiceMeta): DecoratedServiceRecord {
    return new DecoratedServiceRecord(this.createNewClassServiceMeta(override));
  }

  /**
   * Returns a new instance with a deep copy of service meta.
   */
  cloneAndRegisterNewService(newId: string, override: ServiceMeta): DecoratedServiceRecord {
    const newClass: any =
      class extends this.clazz {
      }
    const newGid = getOrMakeGidForConstructor(newClass);
    newClass.getDecoratorGid = () => {
      return newGid;
    }

    const newMeta = this.createNewClassServiceMeta(override);
    newMeta.clazz = newClass;
    newMeta.gid = newGid;
    newMeta.metadata[0].id = newId;
    newMeta.metadata[0].gid = newGid;

    return new DecoratedServiceRecord(newMeta);
  }

  createNewClassServiceMeta(override: ServiceMeta) {
    const newMeta = cloneDeep(this.originalMeta);

    const rec = newMeta.metadata[0];
    const {priority, config, injectConfig, isFactory, interfaces, disabled} = override;

    rec.disabled = disabled === undefined ? this.isDisabled : disabled;
    if (priority !== undefined) {
      rec.priority = priority;
    }
    if (config) {
      rec.config = config;
    }
    if (injectConfig) {
      rec.injectConfig = injectConfig;
    }
    if (isFactory) {
      rec.isFactory = isFactory;
    }
    if (interfaces) {
      rec.interfaces = [...interfaces];
    }

    return newMeta;
  }
}

export const getAllServicesMap = () => {
  const map: Record<string, DecoratedServiceRecord[]> = {};
  for (const rec of getDecoratedServiceRecords()) {
    if (!map[rec.id]) {
      map[rec.id] = [];
    }
    map[rec.id].push(rec);
  }
  return map;
}

export const getAllServicesByGidMap = () => {
  const map: Record<string, DecoratedServiceRecord> = {};
  for (const rec of getDecoratedServiceRecords()) {
    map[rec.gid] = rec;
  }
  return map;
}

let allServiceByGid: undefined | Record<string, DecoratedServiceRecord>;

export const getAllServicesForBundle = (bundleId: string): DecoratedServiceRecord[] => {
  if (!allServiceByGid) {
    allServiceByGid = getAllServicesByGidMap();
  }

  const gids = getGidsForBundle(bundleId);
  const recs: DecoratedServiceRecord[] = [];
  for (const gid of gids) {
    if (allServiceByGid[gid]) {
      recs.push(allServiceByGid[gid]);
    }
  }

  return recs;
}
export const getServiceMetadataBuilder = () => {
  return new DecoratedClassBuilder<ServiceMeta, MethodInvoker, DependencyMeta>(
    "service-container"
  );
};
export const cloneServiceRecord = (rec: ServiceRecord): ServiceRecord => {
  return {
    provider: rec.provider,
    id: rec.id,
    gid: rec.gid,
    priority: rec.priority,
    clazz: rec.clazz,
    isDisabled: rec.isDisabled,
    isFactory: rec.isFactory,
    injectConfig: rec.injectConfig,
    config: rec.config,
    interfaces: [...rec.interfaces],
    status: ServiceState.registered,
    factory: rec.factory,
    injectableFactory: [...rec.injectableFactory],
    activator: rec.activator,
    deactivator: rec.deactivator,
    dependencies: {...rec.dependencies},
    injectableMethods: {...rec.injectableMethods},
    subscribeToInterfaces: [...rec.subscribeToInterfaces]
  }
}

/**
 * Generates the full service reference for a config from default provider. Note that the suffixes
 * are derived from ID_RUNTIME and CONFIG_PROVIDER_SUFFIX in `common/runtime.ts`. For circular dep
 * avoidance, moving to this file and dropping const refs.
 */
export const makeConfigId = (subId: string): string => `${subId}@runtime.configProvider`

/**
 * Returns the subId or undefined from a service reference of the form `subId@runtime.configProvider`.
 */
export const extractConfigSubId = (configId: string) => {
  const [s1, s2] = configId.split('@runtime.configProvider');
  return s2 === undefined ? undefined : s1;
}
