import {
  DecoratedClass,
  DecoratedClassBuilder,
  DecoratedMethod,
} from "../decorator";

/**
 * These are the standard priorities used to organize startup. Note that priorities don't absolutely
 * guarantee starting before lower priorities -- if a higher priority service has to wait on a lower
 * level service, this would never be satisfied. Treat highest priority services as:
 *
 * - those having no dependencies (or dependences that are likely high priority) AND
 * - are a base dependency for large branches of the service tree
 */
export enum ContainerPhases {
  /** The most vital services necessary to connect the next layer */
  bootstrap = 10000,
  /** Critical db and other data provider initialization */
  datalink = 90000,
  /** Config handlers necessary to provide configs for lower priority services */
  config = 80000,
  usercritical = 10000,
  default = 0,
  userlow = -10000,
}

export type BaseServiceMeta = {
  interfaces?: string[];
  disabled?: boolean;
  /** Default 0. Higher number means earlier start. Load order on tie. */
  priority?: number;
  /**
   * If set and true, derives config id as `config/${serviceId}`. If string, uses string value as
   * config id. The config service then becomes a dependency and will be injected either as the
   * first parameter in the constructor OR the first parameter in @Factory method.
   */
  injectConfig?: boolean | string;
};

export type ServiceMeta = BaseServiceMeta & {
  id: string;
  gid: string;
};

export enum ServiceState {
  registered = 0,
  activating = 11,
  activated = 20,
  deactivating = 21,
  deactivated = 30,
}

export type InjectableList = (DependencyMeta | undefined)[];

// @todo add inherit:boolean to indicate copying defs from superclass?
export type ServiceRecord = {
  id: string;
  gid: string;
  disabled?: boolean;
  priority: number;
  interfaces: string[];
  clazz: any;
  injectConfig?: string;
  status: ServiceState;
  factory: string;
  injectableFactory: InjectableList;
  activator: string;
  deactivator: string;
  dependencies: Record<string, any>;
  injectableMethods: Record<string, InjectableList>;
};

export enum MethodType {
  activate = 1,
  deactivate = 2,
  factory = 3,
  injectable = 4,
}

export type MethodInvoker = {
  type: MethodType;
  name: string;
};

export type DependencyMeta = {
  /** Id of dependency. Takes precedence over interfaces */
  id?: string;
  /** match 1+ */
  matchInterface?: string;
  /**
   * If specified, provides more specific constraints on matches (e.g. need minimum
   * of 5 matching services). Defaults to `{min:1}`
   */
  matchCriteria?: {
    min?: number;
  };
};

export type ServiceProviderMeta = {};

export type ScopedFactoryServiceMeta = {};

export type ClassServiceMetadata = DecoratedClass<
  ServiceMeta,
  MethodInvoker,
  DependencyMeta
>;

export const getServiceMetadataBuilder = () => {
  return new DecoratedClassBuilder<ServiceMeta, MethodInvoker, DependencyMeta>(
    "service-container"
  );
};

/**
 * Normalizes DecoratedClass metadata.
 */
export class DecoratedServiceRecord implements ServiceRecord {
  provider: string;
  id: string = "";
  gid: string = "";
  priority = 0;
  clazz: any;
  injectConfig?: string;
  interfaces: string[] = [];
  status: ServiceState = ServiceState.registered;
  factory = "";
  injectableFactory: InjectableList = [];
  activator = "";
  deactivator = "";
  dependencies: Record<string, DependencyMeta["matchCriteria"]> = {};
  injectableMethods: Record<string, InjectableList> = {};

  constructor(classMeta: ClassServiceMetadata) {
    this.provider = classMeta._provider;
    this.id = classMeta.metadata[0].id;
    this.gid = classMeta.metadata[0].gid;
    const ic = classMeta.metadata[0].injectConfig;
    if (ic) {
      this.injectConfig = ic === true ? `config/${this.id}` : ic;
      this.dependencies[this.injectConfig] = {};
    }
    this.clazz = classMeta.clazz;
    this.priority = classMeta.metadata[0].priority ?? 0;
    this.interfaces = classMeta.metadata[0].interfaces ?? [];
    // @todo process explicit deps
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
              .matchCriteria ?? { min: 1 };
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
}

export interface Container {
  /** Checks if a service has been registered. */
  has(id: string): boolean;
  /** Retrieve a service by id. Throws error if not found. */
  resolve<T extends any = any>(id: string): T;
  /** Retrieve many services conforming to query. */
  query<T extends any = any>(matchInterface: string): T[];
  /**
   * Initializes services and resolves dependencies. Expectation is that all non-disabled
   * services must start before promise is resolved. Future improvements will allow for return
   * on partial start. */
  startup(): Promise<Container>;
  /**
   * Stops all services. Expectation is that dependents on a service will be recursively shutdown
   * before a specific service is shutdown, and that any shutdown errors will only be logged but
   * not prevent shutdown.
   */
  shutdown(): Promise<Container>;
  /**
   * Advertise a service record to container for [immediate] startup.
   */
  register(metadata: DecoratedServiceRecord);

  // unregister(id: string);
  // newScope(): ServiceContainer;
}
