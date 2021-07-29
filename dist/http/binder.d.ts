import { ErrorRequestHandler, Request, RequestHandler, Response } from "express";
import { DecoratedClass, DecoratedMethod } from "../decorator";
import { ControllerConfig, HandlerConfig, InjectedRequestParam, RequestParamConfig } from "./types";
import { ServiceContainer } from "../service-container";
export declare const SVC_HTTP_DEFAULT = "http.server";
export declare type AllowedHandler = RequestHandler | ErrorRequestHandler;
/**
 * Accepts a handler generated from `makeRequestHandlerProxyToController()` so that caller can bind it to whatever service
 * requires it.
 */
export declare type BoundHandlerCallback = (handler: AllowedHandler, param: HandlerConfig, controller: DecoratedClass<ControllerConfig>) => void;
/**
 * For generated handlers, allows a preconditional check for given request before any further processing is done.
 * For instance, if a route defines `headers`, the precondition can ensure that only a request with one of the allowed
 * headers is processed. Must throw on failure.
 */
export declare type BoundHandlerPrecondition = (request: Request, response: Response) => void;
/**
 * Attempts to extract each arg's corresponding request parameter value. If
 * transformer is defined, apply to value. First 3 args are ignored since
 * they're expected to be request handler args.
 */
export declare const extractParametersAsArgsFromRequest: (request: Request, response: Response, handlerConfig: DecoratedMethod<HandlerConfig, InjectedRequestParam>) => any[];
/**
 * Performs the following constraints on each argument:
 *
 * - if required and arg is empty, throw error
 * - if validator defined and fails, throw error
 * - if enumValues set and fails, throw error
 */
export declare const assertArgsAreValid: (args: any[], request: Request, response: Response, route: DecoratedMethod<HandlerConfig, InjectedRequestParam>) => void;
/**
 * Proxies request objects to `thisCtx.methodName`, extracting and validating any annotated args. Precondition allows
 * scoped request assertions (e.g. only allowing specific headers). Runtime exceptions are piped through `next()`.
 *
 * @param controller The instance the target method is bound to (generally, but not limited to, @Controller classes)
 * @param methodName The name of the target method
 * @param handlerConfig Aggregated method decorations
 * @param precondition
 */
export declare const makeRequestHandlerProxyToController: (controller: any, methodName: string, handlerConfig: DecoratedMethod<HandlerConfig, InjectedRequestParam>, precondition?: BoundHandlerPrecondition | undefined) => RequestHandler;
export declare const makeErrorHandlerProxyToController: (controller: any, methodName: string, handlerConfig: DecoratedMethod<HandlerConfig, InjectedRequestParam>) => ErrorRequestHandler;
/**
 * Takes set of HTTP annotations and attempts to:
 *
 * 1. create/discover controller instance
 * 2. generate a request handler that proxies incoming request to controller (with expanded args)
 */
export declare class HttpDecoratorsBinder {
    container: ServiceContainer;
    controllers: DecoratedClass<ControllerConfig, HandlerConfig, RequestParamConfig, any>[];
    constructor(container: ServiceContainer, controllers?: DecoratedClass[]);
    setControllers(controllers: DecoratedClass[]): this;
    bind(callback: BoundHandlerCallback): void;
}
