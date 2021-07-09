/// <reference types="node" />
import { ServiceContainer } from "./service-container";
import { HttpDecoratorsBinder } from "./http/binder";
import { DecoratedClass } from "./decorator";
import express from "express";
import * as http from "http";
export declare class Dinoframe {
    static readonly ID_EXPRESS_APP = "express.app";
    static readonly ID_HTTP_SERVER = "http.server";
    private bundleIds;
    private _serviceContainer;
    private _httpBinder;
    constructor(bundleIds: string[]);
    get serviceContainer(): ServiceContainer;
    get httpBinder(): HttpDecoratorsBinder;
    getExpressApp(): express.Application;
    getHttpServer(): http.Server;
    getMetadataForBundles(): DecoratedClass<any, any, any, any>[];
    startup(): Promise<void>;
    protected processHttpDecorators(controllers: DecoratedClass[]): void;
}
