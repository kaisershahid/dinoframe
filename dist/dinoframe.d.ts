/// <reference types="node" />
import { ServiceContainer } from "./service-container";
import { HttpDecoratorsBinder } from "./http/binder";
import { DecoratedClass } from "./decorator";
import express from "express";
import * as http from "http";
import { BundleConfig } from "./service-container/bundle";
import { DecoratedServiceRecord } from "./service-container/utils";
export declare class Dinoframe {
    static readonly ID_EXPRESS_APP = "express.app";
    static readonly ID_HTTP_SERVER = "http.server";
    private bundleIds;
    private bundleConfigs;
    private _serviceContainer;
    private _httpBinder;
    constructor(bundleIds: string[]);
    get serviceContainer(): ServiceContainer;
    get httpBinder(): HttpDecoratorsBinder;
    addBundleConfig(id: string, config: BundleConfig): this;
    getExpressApp(): express.Application;
    getHttpServer(): http.Server;
    activateBundles(): DecoratedServiceRecord[];
    startup(): Promise<void>;
    protected processHttpDecorators(controllers: DecoratedClass[]): void;
}
