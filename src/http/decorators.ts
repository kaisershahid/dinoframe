import { DecoratedClassBuilder } from "../decorator";
import {
  ControllerConfig,
  RequestParamConfig,
  InjectedRequestParam,
  RouteConfig,
  HandlerConfig,
  HandlerConfigType,
  MiddlewareConfig,
  ErrorMiddlewareConfig,
} from "./types";

const collector = new DecoratedClassBuilder<
  ControllerConfig,
  HandlerConfig,
  InjectedRequestParam
>("dinoframe.http");

export const Controller = (params: ControllerConfig = {}) => {
  return (target: any) => {
    collector.pushClass(target, params, "Controller");
  };
};

export const isParameterEmpty = (v: any): boolean =>
  v === "" || v === undefined || v === null;

export const Route = (params: RouteConfig) => {
  return (proto: any, name: string, desc: PropertyDescriptor) => {
    collector.pushMethod(
      proto,
      name,
      {
        type: HandlerConfigType.route,
        name,
        desc,
        ...params,
      },
      "Route"
    );
  };
};

export const Middleware = (params: MiddlewareConfig = {}) => {
  return (proto: any, name: string, desc: PropertyDescriptor) => {
    collector.pushMethod(
      proto,
      name,
      {
        type: HandlerConfigType.middleware,
        name,
        desc,
        ...params,
      },
      "Middleware"
    );
  };
};

export const ErrorMiddleware = (params: ErrorMiddlewareConfig = {}) => {
  return (proto: any, name: string, desc: PropertyDescriptor) => {
    collector.pushMethod(
      proto,
      name,
      {
        type: HandlerConfigType.error,
        name,
        desc,
        ...params,
      },
      "ErrorMiddleware"
    );
  };
};

export const RequestParam = (
  name: string,
  params: Partial<RequestParamConfig> = {}
) => {
  return (proto: any, method: string, pos: number) => {
    collector.pushParameter(
      proto,
      method,
      pos,
      { name, method, pos, ...params },
      "RequestParam"
    );
  };
};

export const getHttpAnnotations = () => collector.getFinalized();
