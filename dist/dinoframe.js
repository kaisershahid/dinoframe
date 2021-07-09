"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const service_container_1 = require("./service-container");
const binder_1 = require("./http/binder");
const decorator_1 = require("./decorator");
const types_1 = require("./service-container/types");
const types_2 = require("./http/types");
class Dinoframe {
    constructor(bundleIds) {
        this.bundleIds = bundleIds;
        this._serviceContainer = new service_container_1.ServiceContainer();
        this._httpBinder = new binder_1.HttpDecoratorsBinder(this._serviceContainer);
    }
    get serviceContainer() {
        return this._serviceContainer;
    }
    get httpBinder() {
        return this._httpBinder;
    }
    getExpressApp() {
        return this._serviceContainer.resolve(Dinoframe.ID_EXPRESS_APP);
    }
    getHttpServer() {
        return this._serviceContainer.resolve(Dinoframe.ID_HTTP_SERVER);
    }
    getMetadataForBundles() {
        return decorator_1.flattenManyBundlesMetadata(this.bundleIds);
    }
    async startup() {
        // 1. get only the records for the given bundles
        const meta = this.getMetadataForBundles();
        // 2. extract service-container records from subset of bundle meta
        const services = decorator_1.filterMetadataByProvider(meta, require("./service-container").PROVIDER_ID);
        services.forEach((meta) => {
            this._serviceContainer.register(new types_1.DecoratedServiceRecord(meta));
        });
        try {
            await this._serviceContainer.startup();
        }
        catch (e) {
            console.error(e);
            throw e;
        }
        // 3. now register http stuff after services load
        const controllers = decorator_1.filterMetadataByProvider(meta, require("./http").PROVIDER_ID);
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
                case types_2.HandlerConfigType.route:
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
                case types_2.HandlerConfigType.middleware:
                    if (path) {
                        console.log(`express.app.middleware: (${rec.priority} - ${cname}.${rec.name}) ${path}`);
                        httpApp.use(path, handler);
                    }
                    else {
                        console.log(`express.app.middleware: (${rec.priority} - ${cname}.${rec.name})`);
                        httpApp.use(handler);
                    }
                    break;
                case types_2.HandlerConfigType.error:
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