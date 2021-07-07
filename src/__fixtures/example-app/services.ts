import { BundleDecoratorFactory } from "../../decorator";
import {Activate, Factory, Inject, Service} from "../../service-container/decorators";
import { Config, StandardConfig } from "../../service-container/common/runtime";
import { FactoryContainer } from "../../service-container/types";
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
@Service("config/controller.upload")
export class ControllerConfig {
  @Factory
  static getConfig() {
    return new StandardConfig({ controllerConfig: true });
  }
}

@ServiceBundle
@Service("config/trivial")
export class TrivialConfig {
  @Factory
  static getConfig() {
    return new StandardConfig({ name: "trivial from config" });
  }
}
