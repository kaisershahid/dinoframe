import { BundleDecoratorFactory } from "../../decorator";
import { Factory, Inject, Service } from "../../service-container/decorators";
import { Config, StandardConfig } from "../../service-container/common/runtime";

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

  constructor(conf: Config) {
    this.name = conf.get("name");
  }

  @Factory
  static makeInstance(config: Config) {
    return new TrivialService(config);
  }

  getName() {
    return this.name;
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
