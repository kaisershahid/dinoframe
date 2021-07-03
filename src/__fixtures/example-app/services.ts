import { BundleDecoratorFactory } from "../../decorator";
import { Factory, Inject, Service } from "../../service-container/decorators";
import { Config, StandardConfig } from "../../service-container/common/runtime";
import { FactoryContainer } from "../../service-container/types";

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

  setLogger(@Inject({ id: "trivial@logger.logger" }) log: Logger) {
    this.log = log;
  }

  getName() {
    this.log.log("someone called getName()");
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

export class Logger {
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  log(message: string) {
    console.log(`[${this.name}] ${message}`);
  }
}

/**
 * Generates 'singleton' logger instances for allowed ids. Reference specific logger with
 * `<name>@logger.logger`
 */
@ServiceBundle
@Service("logger.logger", {
  isFactory: true,
})
export class LoggerFactory implements FactoryContainer {
  private static ALLOWED = ["controller", "trivial"];
  private cache: Record<string, Logger> = {};

  has(id: string): boolean {
    return LoggerFactory.ALLOWED.includes(id);
  }

  resolve<T>(id: string): any {
    if (!this.cache[id]) {
      this.cache[id] = new Logger(id);
    }

    return this.cache[id];
  }
}
