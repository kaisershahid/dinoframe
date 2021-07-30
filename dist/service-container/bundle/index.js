"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../utils");
class BundleActivator {
    constructor(id, config) {
        this.id = id;
        this.config = config;
    }
    loadDependencies() {
        var _a, _b;
        const bundleDeps = (_a = this.config.bundleDependencies) !== null && _a !== void 0 ? _a : [];
        const modDeps = (_b = this.config.moduleDependencies) !== null && _b !== void 0 ? _b : [];
        for (let modDep of modDeps) {
            const [mod, clazz] = modDep.split(":");
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
    processServiceRecords(bundleRecs, serviceMap) {
        var _a, _b, _c, _d, _e;
        // index configs by service id
        const configMap = {};
        for (const svcCfg of this.config.services) {
            const effId = (_a = svcCfg.runtimeId) !== null && _a !== void 0 ? _a : svcCfg.id;
            if (!configMap[effId]) {
                configMap[effId] = svcCfg;
            }
        }
        // track processed services
        const recsById = {};
        // add core services and apply overrides if they exist
        for (const rec of bundleRecs) {
            recsById[rec.id] = rec;
            const conf = configMap[rec.id];
            if (conf) {
                // both here and below, because service config values are provided in the bundle config,
                // we're assuming that's the intended runtime config, so we point injectConfig to the
                // runtime config provider
                const overrides = (_b = conf.meta) !== null && _b !== void 0 ? _b : {};
                let config = conf.config;
                let injectConfig;
                if (config) {
                    injectConfig = utils_1.makeConfigId(rec.id);
                    config = {
                        ...((_c = rec.originalMeta.metadata[0].config) !== null && _c !== void 0 ? _c : {}),
                        ...config,
                    };
                }
                overrides.injectConfig = injectConfig;
                recsById[rec.id] = rec.clone({
                    id: rec.id,
                    gid: rec.gid,
                    ...overrides,
                    config: conf.config,
                    disabled: conf.disabled,
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
                const overrides = (_d = conf.meta) !== null && _d !== void 0 ? _d : {};
                let config = conf.config;
                let injectConfig;
                if (config) {
                    injectConfig = utils_1.makeConfigId(svcId);
                    config = {
                        ...((_e = recsById[conf.id].originalMeta.metadata[0].config) !== null && _e !== void 0 ? _e : {}),
                        ...config,
                    };
                }
                overrides.injectConfig = injectConfig;
                // @todo duplicate all decorators for gid -> newGid
                // @todo clone with clazz, and pass to cloneAndRegisterNewService()
                recsById[svcId] = recsById[conf.id].cloneAndRegisterNewService(svcId, {
                    id: svcId,
                    gid: "",
                    ...overrides,
                    config,
                    disabled: conf.disabled,
                });
            }
        }
        return Object.values(recsById);
    }
}
exports.BundleActivator = BundleActivator;
//# sourceMappingURL=index.js.map