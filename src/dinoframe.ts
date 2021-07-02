import {ServiceContainer} from "./service-container";
import {HttpDecoratorsBinder} from "./http/binder";
import {DecoratedClass, filterMetadataByProvider, flattenManyBundlesMetadata} from "./decorator";
import {DecoratedServiceRecord} from "./service-container/types";
import {HandlerConfigType} from "./http/types";
import express from 'express';
import * as http from "http";

export class Dinoframe {
    static readonly ID_EXPRESS_APP = 'express.app';
    static readonly ID_HTTP_SERVER = 'http.server';
    private bundleIds: string[];
    private _serviceContainer: ServiceContainer;
    private _httpBinder: HttpDecoratorsBinder;

    constructor(bundleIds: string[]) {
        this.bundleIds = bundleIds;
        this._serviceContainer = new ServiceContainer();
        this._httpBinder = new HttpDecoratorsBinder(this._serviceContainer);
    }

    get serviceContainer(): ServiceContainer {
        return this._serviceContainer;
    }

    get httpBinder(): HttpDecoratorsBinder {
        return this._httpBinder;
    }

    getExpressApp() {
        return this._serviceContainer.resolve<express.Application>(Dinoframe.ID_EXPRESS_APP);
    }

    getHttpServer() {
        return this._serviceContainer.resolve<http.Server>(Dinoframe.ID_HTTP_SERVER);
    }

    async startup() {
        // 1. get only the records for the given bundles
        const meta = flattenManyBundlesMetadata(this.bundleIds);
        // 2. extract service-container records from subset of bundle meta
        const services = filterMetadataByProvider(meta, require('./service-container').PROVIDER_ID);
        services.forEach(meta => {
            this._serviceContainer.register(new DecoratedServiceRecord(meta))
        })

        await this._serviceContainer.startup();

        // 3. now register http stuff after services load
        const controllers = filterMetadataByProvider(meta, require('./http').PROVIDER_ID);
        this.processHttpDecorators(controllers);
    }

    protected processHttpDecorators(controllers: DecoratedClass[]) {
        if (!this._serviceContainer.has(Dinoframe.ID_EXPRESS_APP)) {
            console.warn(`processHttpDecorators(): ${Dinoframe.ID_EXPRESS_APP} not found, skipping http`);
            return;
        }

        const httpApp = this.getExpressApp();
        this._httpBinder.setControllers(controllers).bind((handler, rec, ctrl) => {
            const {path, methods, type} = rec;
            const mth = methods ? methods.map(m=>m.toLowerCase()) : ['get'];
            const cname = `gid=${ctrl.gid} ${ctrl.clazz.name}`;
            switch (type) {
                case HandlerConfigType.route:
                    let p = path as string;
                    if (mth[0] == '*') {
                        console.log(`express.app.route: (${rec.priority} - ${cname}.${rec.name}) ${mth[0]} ${path}`)
                        httpApp.all(p, handler);
                    } else {
                        mth.forEach(m => {
                            console.log(`express.app.route: (${rec.priority} - ${cname}.${rec.name}) ${m} ${path}`)
                            httpApp[m](p, handler)
                        });
                    }
                    break;
                case HandlerConfigType.middleware:
                    if (path) {
                        console.log(`express.app.middleware: (${rec.priority} - ${cname}.${rec.name}) ${path}`)
                        httpApp.use(path, handler)
                    } else {
                        console.log(`express.app.middleware: (${rec.priority} - ${cname}.${rec.name})`)
                        httpApp.use(handler);
                    }
                    break;
                case HandlerConfigType.error:
                    console.log(`express.app.errorhandler: (${rec.priority} - ${cname}.${rec.name})`)
                    httpApp.use(handler);
                    break;
            }
        });
    }
}
