import { Request, Response } from 'express';
import { DecoratedParameter } from '../decorator';
export declare type HeaderRecord = {
    name?: string;
    values?: string[];
    description?: string;
    required?: boolean;
};
export declare type BaseDecoratorConfig = {
    [key: string]: any;
    priority?: number;
    path?: string;
    methods?: string[];
    headers?: Record<string, HeaderRecord>;
};
export declare type RouteConfig = BaseDecoratorConfig & {
    path: string;
    /** @todo unsupported; reconcile with @RequestParam */
    parameters?: Record<string, ParameterRecord>;
    /** @todo unsupported */
    body?: BodyRecord;
    /** @todo unsupported */
    response?: ResponseRecord;
};
export declare type MiddlewareConfig = BaseDecoratorConfig & {};
export declare type ErrorMiddlewareConfig = BaseDecoratorConfig & {};
export declare enum HandlerConfigType {
    route = 1,
    middleware = 2,
    error = 3
}
export declare type HandlerConfig = (RouteConfig | MiddlewareConfig | ErrorMiddlewareConfig) & {
    type: HandlerConfigType;
};
export declare type ControllerConfig = BaseDecoratorConfig & {
    /** @todo unsupported */
    deserializer?: any;
};
export declare type InjectableParamContext = {
    request: Request;
    response: Response;
    def: RequestParamConfig;
};
export declare type InjectableParamValidator = (value: any, context: InjectableParamContext) => string | undefined;
export declare type InjectableParamTransformer = (value: any, context: InjectableParamContext) => any;
export declare type RequestParamConfig = {
    name: string;
    required?: boolean;
    enumValues?: any[];
    validator?: InjectableParamValidator;
    transformer?: InjectableParamTransformer;
};
export declare type InjectedRequestParam = DecoratedParameter & RequestParamConfig;
export declare class RequestParamError extends Error {
    params: RequestParamConfig;
    constructor(message: any, params: RequestParamConfig);
}
export declare type ParameterRecord = {
    name?: string;
    type?: 'string' | 'number';
    enumValues?: string[];
    description?: string;
    required?: boolean;
};
export declare type BodyExampleRecord = {
    description?: string;
    value: any;
};
export declare type BodyRecord = {
    description?: string;
    examples?: BodyExampleRecord[];
};
export declare type ResponseRecord = {
    headers?: Record<string, HeaderRecord>;
    body?: BodyRecord;
};
export declare type HandlerRecord = {
    type: HandlerConfigType;
    /** Default: `''` */
    path: string;
    /** Default: `[]` */
    methods: string[];
    headers: Record<string, HeaderRecord>;
    parameters: Record<string, ParameterRecord>;
    body?: BodyRecord;
    response?: ResponseRecord;
    /**
     * Registration order, from highest to lowest. Default is 0.
     */
    priority: number;
    /** The method name to invoke on the controller. */
    invokeName: string;
    constructorGid: string;
    controllerId: string;
};
