import { ControllerConfig, RequestParamConfig, InjectedRequestParam, RouteConfig, HandlerConfig, MiddlewareConfig, ErrorMiddlewareConfig } from "./types";
export declare const Controller: (params?: ControllerConfig) => (target: any) => void;
export declare const isParameterEmpty: (v: any) => boolean;
export declare const Route: (params: RouteConfig) => (proto: any, name: string, desc: PropertyDescriptor) => void;
export declare const Middleware: (params?: MiddlewareConfig) => (proto: any, name: string, desc: PropertyDescriptor) => void;
export declare const ErrorMiddleware: (params?: ErrorMiddlewareConfig) => (proto: any, name: string, desc: PropertyDescriptor) => void;
export declare const RequestParam: (name: string, params?: Partial<RequestParamConfig>) => (proto: any, method: string, pos: number) => void;
export declare const getHttpAnnotations: () => import("../decorator").DecoratedClass<ControllerConfig, HandlerConfig, InjectedRequestParam, any>[];
