import { ServiceContainer } from "./service-container";
import { HttpDecoratorsBinder } from "./http/binder";
import {
  DecoratedClass,
  filterMetadataByProvider,
  flattenManyBundlesMetadata,
  getBundledMetadata,
} from "./decorator";
import { HandlerConfigType } from "./http/types";
import express from "express";
import * as http from "http";
import { BundleActivator, BundleConfig } from "./service-container/bundle";
import {
  DecoratedServiceRecord,
  getAllServicesByGidMap,
  getAllServicesForBundle,
  getAllServicesMap,
} from "./service-container/utils";
import {
  ID_RUNTIME,
  RuntimeConfigProvider,
  StandardConfig,
} from "./service-container/common/runtime";
import { ID_LOGGER } from "./service-container/common/logging";
import { ClassServiceMetadata } from "./service-container/types";
import { getHttpMetaByGids } from "./http/decorators";

export class Dinoframe {
  static readonly ID_EXPRESS_APP = "express.app";
  static readonly ID_HTTP_SERVER = "http.server";
  private bundleIds: string[];
  private bundleConfigs: Record<string, BundleConfig> = {};
  private _serviceContainer: ServiceContainer;
  private _httpBinder: HttpDecoratorsBinder;

  constructor(bundleIds: string[]) {
    this.bundleIds = [ID_RUNTIME, ID_LOGGER].concat(bundleIds);
    this._serviceContainer = new ServiceContainer();
    this._httpBinder = new HttpDecoratorsBinder(this._serviceContainer);
  }

  get serviceContainer(): ServiceContainer {
    return this._serviceContainer;
  }

  get httpBinder(): HttpDecoratorsBinder {
    return this._httpBinder;
  }

  addBundleConfig(id: string, config: BundleConfig): this {
    this.bundleConfigs[id] = config;
    return this;
  }

  getExpressApp() {
    return this._serviceContainer.resolve<express.Application>(
      Dinoframe.ID_EXPRESS_APP
    );
  }

  getHttpServer() {
    return this._serviceContainer.resolve<http.Server>(
      Dinoframe.ID_HTTP_SERVER
    );
  }

  activateBundles() {
    const visited: any = {};
    let metaRecords: DecoratedServiceRecord[] = [];

    for (const bundleId of this.bundleIds) {
      if (visited[bundleId]) {
        continue;
      }

      const bundleRecs = getAllServicesForBundle(bundleId);
      if (this.bundleConfigs[bundleId]) {
        const activator = new BundleActivator(
          bundleId,
          this.bundleConfigs[bundleId]
        );
        const bundleDeps = activator.loadDependencies();
        for (const depId of bundleDeps) {
          this.bundleIds.push(depId);
        }

        metaRecords = metaRecords.concat(
          activator.processServiceRecords(bundleRecs, getAllServicesMap())
        );
      } else {
        metaRecords = metaRecords.concat(bundleRecs);
      }
    }

    return metaRecords;
  }

  async startup() {
    // 1. get only the records for the given bundles
    const meta = this.activateBundles();
    // 2. extract service-container records from subset of bundle meta
    const services: DecoratedServiceRecord[] = filterMetadataByProvider(
      meta,
      require("./service-container").PROVIDER_ID
    );

    const cfgProvider = RuntimeConfigProvider.getSingleton();
    services.forEach((svc) => {
      if (svc.config) {
        // binds config to ConfigProvider as `${serviceId}@${ID_RUNTIME}.configProvider`
        cfgProvider.addConfig(svc.id, new StandardConfig(svc.config));
      }
      this._serviceContainer.register(svc);
    });

    try {
      await this._serviceContainer.startup();
    } catch (e) {
      console.error(e);
      throw e;
    }

    // 3. now register http stuff after services load
    const controllers = getHttpMetaByGids(meta.map((rec) => rec.gid));
    console.log("CONTROLLERS=", JSON.stringify(controllers, null, "  "));
    this.processHttpDecorators(controllers);
  }

  protected processHttpDecorators(controllers: DecoratedClass[]) {
    if (!this._serviceContainer.has(Dinoframe.ID_EXPRESS_APP)) {
      console.warn(
        `processHttpDecorators(): ${Dinoframe.ID_EXPRESS_APP} not found, skipping http`
      );
      return;
    }

    const httpApp = this.getExpressApp();
    this._httpBinder.setControllers(controllers).bind((handler, rec, ctrl) => {
      const { path, methods, type } = rec;
      const mth = methods ? methods.map((m) => m.toLowerCase()) : ["get"];
      const cname = `gid=${ctrl.gid} ${ctrl.clazz.name}`;
      switch (type) {
        case HandlerConfigType.route:
          let p = path as string;
          if (mth[0] == "*") {
            console.log(
              `express.app.route: (${rec.priority} - ${cname}.${rec.name}) ${mth[0]} ${path}`
            );
            httpApp.all(p, handler);
          } else {
            mth.forEach((m) => {
              console.log(
                `express.app.route: (${rec.priority} - ${cname}.${rec.name}) ${m} ${path}`
              );
              httpApp[m](p, handler);
            });
          }
          break;
        case HandlerConfigType.middleware:
          if (path) {
            console.log(
              `express.app.middleware: (${rec.priority} - ${cname}.${rec.name}) ${path}`
            );
            httpApp.use(path, handler);
          } else {
            console.log(
              `express.app.middleware: (${rec.priority} - ${cname}.${rec.name})`
            );
            httpApp.use(handler);
          }
          break;
        case HandlerConfigType.error:
          console.log(
            `express.app.errorhandler: (${rec.priority} - ${cname}.${rec.name})`
          );
          httpApp.use(handler);
          break;
      }
    });
  }
}
