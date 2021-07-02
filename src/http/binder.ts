import {ErrorRequestHandler, Request, RequestHandler, Response} from 'express';
import {DecoratedClass, DecoratedMethod} from '../decorator';
import {isParameterEmpty} from './decorators';
import {
    BaseDecoratorConfig,
    ControllerConfig,
    HandlerConfig,
    HandlerConfigType,
    InjectedRequestParam,
    RequestParamConfig,
    RequestParamError,
} from './types';
import {ServiceContainer} from "../service-container";

export const SVC_HTTP_DEFAULT = 'http.server';

export type AllowedHandler = RequestHandler | ErrorRequestHandler;

/**
 * Accepts a handler generated from `makeRequestHandlerProxyToController()` so that caller can bind it to whatever service
 * requires it.
 */
export type BoundHandlerCallback = (
    handler: AllowedHandler,
    param: HandlerConfig,
    controller: DecoratedClass<ControllerConfig>
) => void;

/**
 * For generated handlers, allows a preconditional check for given request before any further processing is done.
 * For instance, if a route defines `headers`, the precondition can ensure that only a request with one of the allowed
 * headers is processed. Must throw on failure.
 */
export type BoundHandlerPrecondition = (request: Request, response: Response) => void;


/**
 * Attempts to extract each arg's corresponding request parameter value. If
 * transformer is defined, apply to value. First 3 args are ignored since
 * they're expected to be request handler args.
 */
export const extractParametersAsArgsFromRequest = (
    request: Request,
    response: Response,
    handlerConfig: DecoratedMethod<HandlerConfig, InjectedRequestParam>
) => {
    const pushArgs: any[] = [];
    for (let i = 0; i < handlerConfig.parameters.length; i++) {
        if (handlerConfig.parameters[i] === undefined) {
            pushArgs[i] = undefined;
            continue;
        }

        let argVal: any = undefined;
        const params = handlerConfig.parameters[i] as InjectedRequestParam[];

        // we expect 1 @InjectableParam per arg
        const param = params[0];
        const {name, transformer} = param;
        // @todo extract from body if possible
        argVal = request.query[name];

        const ctx = {
            request,
            response,
            def: param,
        };

        if (transformer) {
            argVal = transformer(argVal, ctx);
        }

        pushArgs[i] = argVal;
    }

    const sliceIndex = handlerConfig.metadata[0].type === HandlerConfigType.error ? 4 : 3;
    return pushArgs.slice(sliceIndex);
};

/**
 * Performs the following constraints on each argument:
 *
 * - if required and arg is empty, throw error
 * - if validator defined and fails, throw error
 * - if enumValues set and fails, throw error
 */
export const assertArgsAreValid = (
    args: any[],
    request: Request,
    response: Response,
    route: DecoratedMethod<HandlerConfig, InjectedRequestParam>
) => {
    // params are argument-ordered. each param is a decoration
    for (const params of route.parameters) {
        // non-decorated args will have undefined definition
        if (!params) {
            continue;
        }

        // we expect 1 @InjectableParam per arg
        const param = params[0];
        const {name, required, enumValues, validator, transformer} = param;

        for (const arg of args) {
            if (required && isParameterEmpty(arg)) {
                throw new RequestParamError(`${name}: required`, param);
            }

            if (validator) {
                const errMsg = validator(arg, {
                    request,
                    response,
                    def: param,
                });
                if (errMsg) {
                    throw new RequestParamError(`${name}: ${errMsg}`, param);
                }
            }

            if (enumValues) {
                if (!enumValues.includes(arg)) {
                    throw new RequestParamError(
                        `${name}: got ${arg}; expected: ${JSON.stringify(
                            enumValues
                        )}`,
                        param
                    );
                }
            }
        }
    }
};

/**
 * Proxies request objects to `thisCtx.methodName`, extracting and validating any annotated args. Precondition allows
 * scoped request assertions (e.g. only allowing specific headers). Runtime exceptions are piped through `next()`.
 *
 * @param controller The instance the target method is bound to (generally, but not limited to, @Controller classes)
 * @param methodName The name of the target method
 * @param handlerConfig Aggregated method decorations
 * @param precondition
 */
export const makeRequestHandlerProxyToController = (
    controller: any,
    methodName: string,
    handlerConfig: DecoratedMethod<HandlerConfig, InjectedRequestParam>,
    precondition?: BoundHandlerPrecondition
): RequestHandler => {
    return (request, response, next) => {
        try {
            precondition?.(request, response);
            const paramArgs = extractParametersAsArgsFromRequest(
                request,
                response,
                handlerConfig
            );
            assertArgsAreValid(paramArgs, request, response, handlerConfig);
            return (controller[methodName] as Function)(
                ...[request, response, next, ...paramArgs]
            );
        } catch (e) {
            next(e);
        }
    };
};

export const makeErrorHandlerProxyToController = (
    controller: any,
    methodName: string,
    handlerConfig: DecoratedMethod<HandlerConfig, InjectedRequestParam>,
): ErrorRequestHandler => {
    return (err, request, response, next) => {
        const paramArgs = extractParametersAsArgsFromRequest(
            request,
            response,
            handlerConfig
        );

        return (controller[methodName] as Function)(
            ...[err, request, response, next, ...paramArgs]
        );
    }

};

/**
 * Takes set of HTTP annotations and attempts to:
 *
 * 1. create/discover controller instance
 * 2. generate a request handler that proxies incoming request to controller (with expanded args)
 */
export class HttpDecoratorsBinder {
    container: ServiceContainer;
    controllers: DecoratedClass<ControllerConfig,
        HandlerConfig,
        RequestParamConfig,
        any>[];

    constructor(container: ServiceContainer, controllers: DecoratedClass[] = []) {
        this.container = container;
        this.controllers = [...controllers];
    }

    setControllers(controllers: DecoratedClass[]) {
        this.controllers = [...controllers];
        return this;
    }

    bind(callback: BoundHandlerCallback) {
        const boundList: [
                RequestHandler | ErrorRequestHandler,
            HandlerConfig, DecoratedClass<ControllerConfig>
        ][] = [];
        // create scoped functions class-first and push to list
        for (const ctrl of this.controllers) {
            const {gid, clazz} = ctrl;
            const inst = this.container.hasGid(gid) ? this.container.resolveGid(gid) : new clazz();

            let {
                path: pathPrefix,
                methods: defaultMethods,
                headers: defaultHeaders,
            } = ctrl.metadata[0];

            if (!pathPrefix) {
                pathPrefix = '';
            }
            if (!defaultMethods) {
                defaultMethods = ['GET'];
            }
            if (!defaultHeaders) {
                defaultHeaders = {};
            }

            for (const methodName of Object.keys(ctrl.methods)) {
                const methodDecorators = ctrl.methods[methodName];
                for (const meta of methodDecorators.metadata) {
                    let {type, path, methods, headers, priority} = meta;
                    methods = methods ?? defaultMethods;
                    if (!headers) {
                        headers = {...defaultHeaders};
                    }
                    path = type === HandlerConfigType.error ? undefined : path ? `${pathPrefix}${path}` : undefined;
                    priority = priority ?? 0;
                    const bound = type === HandlerConfigType.error
                        ? makeErrorHandlerProxyToController(inst, methodName, methodDecorators)
                        : makeRequestHandlerProxyToController(
                            inst,
                            methodName,
                            methodDecorators
                        );
                    boundList.push([
                        bound,
                        {...meta, path, headers, methods, priority},
                        ctrl
                    ]);
                }
            }
        }

        boundList
            .sort(([a, m1], [b, m2]) => {
                const p1 = m1.priority as number;
                const p2 = m2.priority as number;
                return p1 < p2 ? 1 : p1 > p2 ? -1 : 0;
            })
            .forEach(([bound, param, ctrl]) => callback(bound, param, ctrl));
    }
}
