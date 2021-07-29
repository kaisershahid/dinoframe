/**
 * Standard runtime discoverability types and services.
 */

import { BundleDecoratorFactory } from "../../decorator";
import { Factory, Inject, Service } from "../decorators";
import {
  ContainerPhases,
  FactoryContainer,
  InterfaceAvailableListener,
} from "../types";

/** The default runtime bundle id. */
export const ID_RUNTIME = "runtime";
/** Default runtime bundle. */
const RuntimeBundle = BundleDecoratorFactory(ID_RUNTIME);

/**
 * Encapsulates gettable values. Used to expose environment vars, service configs, etc.
 */
export interface Config {
  get(key: string): any;

  getWithPrefix(keyPrefix: string): Record<string, any>;

  getAll(): Record<string, any>;
}

/**
 * Config service with id. Typically used in conjunction with `INTERFACE_CONFIG_INSTANCE` so that
 * you can hook into main config provider with your own instance.
 */
export interface ConfigWithId extends Config {
  getId(): string;
}

/**
 * Basic implementation of a config.
 */
export class StandardConfig implements Config {
  private config: Record<string, any> = {};

  constructor(cfg: any) {
    this.config = { ...cfg };
  }

  get(key: string): any {
    return this.config[key];
  }

  getWithPrefix(keyPrefix: string): Record<string, any> {
    const env: any = {};
    for (const key of Object.keys(this.config)) {
      if (key.startsWith(keyPrefix)) {
        env[key] = this.config[key];
      }
    }
    return env;
  }

  getAll() {
    return { ...this.config };
  }
}

export class StandardConfigWithId
  extends StandardConfig
  implements ConfigWithId
{
  id: string;

  constructor(id: string, cfg: any) {
    super(cfg);
    this.id = id;
  }

  getId(): string {
    return this.id;
  }
}

/** Interface of the defacto RuntimeEnv instance. */
export const INTERFACE_ENV = "runtime.env";
console.log(Service);
/**
 * Exposes **process.env** as a `Config`. Nothing fancy.
 *
 * To ensure your environment instance is the default, always use `{matchInterface: INTERFACE_ENV}`
 * and set your service to a higher priority.
 */
@RuntimeBundle
@Service(`${ID_RUNTIME}.environment`, {
  interfaces: [INTERFACE_ENV],
  priority: ContainerPhases.bootstrap,
})
export class DefaultRuntimeEnv {
  @Factory
  static makeRuntimeEnv() {
    return new StandardConfig(process.env);
  }
}

export const discover = () => {
  return ID_RUNTIME;
};

export const CONFIG_PROVIDER_SUFFIX = "configProvider";

/**
 * Allows ConfigProvider to handle service as ConfigWithId.
 */
export const INTERFACE_CONFIG_INSTANCE = `${CONFIG_PROVIDER_SUFFIX}.configInstance`;

@RuntimeBundle
@Service(`${ID_RUNTIME}.${CONFIG_PROVIDER_SUFFIX}`, {
  isFactory: true,
  priority: ContainerPhases.bootstrap,
  subscribeToInterfaces: [INTERFACE_CONFIG_INSTANCE],
})
export class RuntimeConfigProvider
  implements FactoryContainer, InterfaceAvailableListener
{
  private static singleton: RuntimeConfigProvider = new RuntimeConfigProvider();

  configs: Record<string, any> = {};

  @Factory
  static getSingleton() {
    return this.singleton;
  }

  has(id: string): boolean {
    return this.configs[id] !== undefined;
  }

  resolve<T>(id: string): T {
    if (!this.configs[id]) {
      throw new Error(`could not find config: ${id}`);
    }

    return this.configs[id];
  }

  addConfig(id: string, config: Record<string, any>) {
    this.configs[id] = config;
  }

  onAvailableInterface(_interface: string, services: any[]) {
    for (const svc of services) {
      if (svc.getId && svc.getAll) {
        this.addConfig(svc.getId(), svc);
      }
    }
  }

  setConfigs(
    @Inject({
      matchInterface: INTERFACE_CONFIG_INSTANCE,
      matchCriteria: { min: 0 },
    })
    configs: StandardConfigWithId[]
  ) {
    this.onAvailableInterface("", configs);
  }
}
