import { BundleDecoratorFactory } from "../../decorator";
import {Activate, Factory, Inject, Service} from "../../service-container/decorators";
import {
  Config,
  INTERFACE_CONFIG_INSTANCE,
  StandardConfig, StandardConfigWithId
} from "../../service-container/common/runtime";
import {ContainerPhases, FactoryContainer} from "../../service-container/types";
import {Logger} from "../../service-container/common/logging";

const ServiceBundle = BundleDecoratorFactory("example-app.services");

export const discover = () => {
  return "example-app.services";
};

@ServiceBundle
@Service("trivial", {
  injectConfig: true,
})
export class TrivialService {
  name = "TrivialService!";
  private log: Logger = undefined as any;

  constructor(conf: Config) {
    this.name = conf.get("name");
  }

  @Factory
  static makeInstance(config: Config) {
    return new TrivialService(config);
  }

  setLogger(@Inject({ id: "trivial@logger.loggerFactory" }) log: Logger) {
    this.log = log;
  }

  getName() {
    this.log.info("someone called getName()");
    return this.name;
  }

  @Activate
  activate() {
    this.log.info("-> TrivialService activated")
  }
}

@ServiceBundle
@Service("config/controller.upload", {
  priority: ContainerPhases.config,
  interfaces: [
    INTERFACE_CONFIG_INSTANCE
  ]
})
export class ControllerConfig {
  @Factory
  static getConfig() {
    return new StandardConfigWithId('controller.upload', { controllerConfig: true });
  }
}

@ServiceBundle
@Service("config/trivial", {
  priority: ContainerPhases.config,
  interfaces: [
    INTERFACE_CONFIG_INSTANCE
  ]
})
export class TrivialConfig {
  @Factory
  static getConfig() {
    return new StandardConfigWithId('trivial', { name: "trivial from config" });
  }
}

@ServiceBundle
@Service('duplicate')
export class DuplicateService {
  private config: Record<string, any>;

  constructor(config?: Record<string, any>) {
    this.config = config ?? {name: 'duplicate.default'};
    console.log('duplicate service:', this.config);
  }
}
