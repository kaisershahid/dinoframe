"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dinoframe = void 0;
const service_container_1 = require("./service-container");
const binder_1 = require("./http/binder");
const decorator_1 = require("./decorator");
const types_1 = require("./http/types");
const bundle_1 = require("./service-container/bundle");
const utils_1 = require("./service-container/utils");
const runtime_1 = require("./service-container/common/runtime");
const logging_1 = require("./service-container/common/logging");
const decorators_1 = require("./http/decorators");
class Dinoframe {
    constructor(bundleIds) {
        this.bundleConfigs = {};
        this.bundleIds = [runtime_1.ID_RUNTIME, logging_1.ID_LOGGER].concat(bundleIds);
        this._serviceContainer = new service_container_1.ServiceContainer();
        this._httpBinder = new binder_1.HttpDecoratorsBinder(this._serviceContainer);
    }
    get serviceContainer() {
        return this._serviceContainer;
    }
    get httpBinder() {
        return this._httpBinder;
    }
    addBundleConfig(id, config) {
        this.bundleConfigs[id] = config;
        return this;
    }
    getExpressApp() {
        return this._serviceContainer.resolve(Dinoframe.ID_EXPRESS_APP);
    }
    getHttpServer() {
        return this._serviceContainer.resolve(Dinoframe.ID_HTTP_SERVER);
    }
    activateBundles() {
        const visited = {};
        let metaRecords = [];
        for (const bundleId of this.bundleIds) {
            if (visited[bundleId]) {
                continue;
            }
            const bundleRecs = utils_1.getAllServicesForBundle(bundleId);
            if (this.bundleConfigs[bundleId]) {
                const activator = new bundle_1.BundleActivator(bundleId, this.bundleConfigs[bundleId]);
                const bundleDeps = activator.loadDependencies();
                for (const depId of bundleDeps) {
                    this.bundleIds.push(depId);
                }
                metaRecords = metaRecords.concat(activator.processServiceRecords(bundleRecs, utils_1.getAllServicesMap()));
            }
            else {
                metaRecords = metaRecords.concat(bundleRecs);
            }
        }
        return metaRecords;
    }
    async startup() {
        // 1. get only the records for the given bundles
        const meta = this.activateBundles();
        // 2. extract service-container records from subset of bundle meta
        const services = decorator_1.filterMetadataByProvider(meta, require("./service-container").PROVIDER_ID);
        const cfgProvider = runtime_1.RuntimeConfigProvider.getSingleton();
        services.forEach((svc) => {
            if (svc.config) {
                // binds config to ConfigProvider as `${serviceId}@${ID_RUNTIME}.configProvider`
                cfgProvider.addConfig(svc.id, new runtime_1.StandardConfig(svc.config));
            }
            this._serviceContainer.register(svc);
        });
        try {
            await this._serviceContainer.startup();
        }
        catch (e) {
            console.error(e);
            throw e;
        }
        // 3. now register http stuff after services load
        const controllers = decorators_1.getHttpMetaByGids(meta.map((rec) => rec.gid));
        this.processHttpDecorators(controllers);
    }
    processHttpDecorators(controllers) {
        if (!this._serviceContainer.has(Dinoframe.ID_EXPRESS_APP)) {
            console.warn(`processHttpDecorators(): ${Dinoframe.ID_EXPRESS_APP} not found, skipping http`);
            return;
        }
        const httpApp = this.getExpressApp();
        this._httpBinder.setControllers(controllers).bind((handler, rec, ctrl) => {
            const { path, methods, type } = rec;
            const mth = methods ? methods.map((m) => m.toLowerCase()) : ["get"];
            const cname = `gid=${ctrl.gid} ${ctrl.clazz.name}`;
            switch (type) {
                case types_1.HandlerConfigType.route:
                    let p = path;
                    if (mth[0] == "*") {
                        console.log(`express.app.route: (${rec.priority} - ${cname}.${rec.name}) ${mth[0]} ${path}`);
                        httpApp.all(p, handler);
                    }
                    else {
                        mth.forEach((m) => {
                            console.log(`express.app.route: (${rec.priority} - ${cname}.${rec.name}) ${m} ${path}`);
                            httpApp[m](p, handler);
                        });
                    }
                    break;
                case types_1.HandlerConfigType.middleware:
                    if (path) {
                        console.log(`express.app.middleware: (${rec.priority} - ${cname}.${rec.name}) ${path}`);
                        httpApp.use(path, handler);
                    }
                    else {
                        console.log(`express.app.middleware: (${rec.priority} - ${cname}.${rec.name})`);
                        httpApp.use(handler);
                    }
                    break;
                case types_1.HandlerConfigType.error:
                    console.log(`express.app.errorhandler: (${rec.priority} - ${cname}.${rec.name})`);
                    httpApp.use(handler);
                    break;
            }
        });
    }
}
exports.Dinoframe = Dinoframe;
Dinoframe.ID_EXPRESS_APP = "express.app";
Dinoframe.ID_HTTP_SERVER = "http.server";
//# sourceMappingURL=dinoframe.js.map