import {BaseServiceMeta, ServiceMeta} from "../types";
import {DecoratedClass, getBundledMetadata} from "../../decorator";
import {DecoratedServiceRecord} from "../utils";

export type BundleConfigService = {
  id: string;
  runtimeId?: string;
  disabled?: boolean;
  meta?: Partial<BaseServiceMeta>;
  config?: Record<string, any>
}

export type BundleConfig = {
  bundleDependencies?: string[];
  moduleDependencies?: string[];
  services: BundleConfigService[];
}

export class BundleActivator {
  private id: string;
  private config: BundleConfig;

  constructor(id: string, config: BundleConfig) {
    this.id = id;
    this.config = config;
  }

  loadDependencies() {
    const bundleDeps = this.config.bundleDependencies ?? [];
    const modDeps = this.config.moduleDependencies ?? [];
    for (let modDep of modDeps) {
      const [mod, clazz] = modDep.split(':');
      // @todo log:debug
      let imp = require(mod);
      if (clazz) {
        imp = imp[clazz];
      }
      // @todo log:debug
      bundleDeps.push(imp.discover());
    }

    return bundleDeps;
  }

  processServiceRecords(bundleRecs: DecoratedServiceRecord[], serviceMap: Record<string, DecoratedServiceRecord[]>): DecoratedServiceRecord[] {
    // index configs by service id
    const configMap: Record<string, BundleConfigService> = {};
    for (const svcCfg of this.config.services) {
      const effId = svcCfg.runtimeId ?? svcCfg.id;
      if (!configMap[effId]) {
        configMap[effId] = svcCfg;
      }
    }

    // track processed services
    const recsById: Record<string, DecoratedServiceRecord> = {};

    // add core services and apply overrides if they exist
    for (const rec of bundleRecs) {
      recsById[rec.id] = rec;
      const conf = configMap[rec.id];
      if (conf) {
        recsById[rec.id] = rec.clone({
          id: rec.id,
          gid: rec.gid,
          ...(conf.meta ?? {}),
          config: conf.config,
          disabled: conf.disabled
        });
      }
    }

    // diff on serviceIds to find new services to project onto recsById
    for (const svcId of Object.keys(configMap)) {
      if (recsById[svcId]) {
        continue;
      }

      const conf = configMap[svcId];
      if (conf) {
        // @todo duplicate all decorators for gid -> newGid
        // @todo clone with clazz, and pass to cloneAndRegisterNewService()
        recsById[svcId] = recsById[conf.id].cloneAndRegisterNewService(svcId, {
          id: svcId,
          gid: '',
          ...(conf.meta ?? {}),
          config: conf.config,
          disabled: conf.disabled
        });
      }
    }

    return Object.values(recsById);
  }
}
