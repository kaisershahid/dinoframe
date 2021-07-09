"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const decorators_1 = require("./decorators");
const types_1 = require("./types");
exports.SVC_HTTP_DEFAULT = "http.server";
/**
 * Attempts to extract each arg's corresponding request parameter value. If
 * transformer is defined, apply to value. First 3 args are ignored since
 * they're expected to be request handler args.
 */
exports.extractParametersAsArgsFromRequest = (request, response, handlerConfig) => {
    const pushArgs = [];
    for (let i = 0; i < handlerConfig.parameters.length; i++) {
        if (handlerConfig.parameters[i] === undefined) {
            pushArgs[i] = undefined;
            continue;
        }
        let argVal = undefined;
        const params = handlerConfig.parameters[i];
        // we expect 1 @InjectableParam per arg
        const param = params[0];
        const { name, transformer } = param;
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
    const sliceIndex = handlerConfig.metadata[0].type === types_1.HandlerConfigType.error ? 4 : 3;
    return pushArgs.slice(sliceIndex);
};
/**
 * Performs the following constraints on each argument:
 *
 * - if required and arg is empty, throw error
 * - if validator defined and fails, throw error
 * - if enumValues set and fails, throw error
 */
exports.assertArgsAreValid = (args, request, response, route) => {
    // params are argument-ordered. each param is a decoration
    for (const params of route.parameters) {
        // non-decorated args will have undefined definition
        if (!params) {
            continue;
        }
        // we expect 1 @InjectableParam per arg
        const param = params[0];
        const { name, required, enumValues, validator, transformer } = param;
        for (const arg of args) {
            if (required && decorators_1.isParameterEmpty(arg)) {
                throw new types_1.RequestParamError(`${name}: required`, param);
            }
            if (validator) {
                const errMsg = validator(arg, {
                    request,
                    response,
                    def: param,
                });
                if (errMsg) {
                    throw new types_1.RequestParamError(`${name}: ${errMsg}`, param);
                }
            }
            if (enumValues) {
                if (!enumValues.includes(arg)) {
                    throw new types_1.RequestParamError(`${name}: got ${arg}; expected: ${JSON.stringify(enumValues)}`, param);
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
exports.makeRequestHandlerProxyToController = (controller, methodName, handlerConfig, precondition) => {
    return (request, response, next) => {
        try {
            precondition === null || precondition === void 0 ? void 0 : precondition(request, response);
            const paramArgs = exports.extractParametersAsArgsFromRequest(request, response, handlerConfig);
            exports.assertArgsAreValid(paramArgs, request, response, handlerConfig);
            return controller[methodName](...[request, response, next, ...paramArgs]);
        }
        catch (e) {
            next(e);
        }
    };
};
exports.makeErrorHandlerProxyToController = (controller, methodName, handlerConfig) => {
    return (err, request, response, next) => {
        const paramArgs = exports.extractParametersAsArgsFromRequest(request, response, handlerConfig);
        return controller[methodName](...[err, request, response, next, ...paramArgs]);
    };
};
/**
 * Takes set of HTTP annotations and attempts to:
 *
 * 1. create/discover controller instance
 * 2. generate a request handler that proxies incoming request to controller (with expanded args)
 */
class HttpDecoratorsBinder {
    constructor(container, controllers = []) {
        this.container = container;
        this.controllers = [...controllers];
    }
    setControllers(controllers) {
        this.controllers = [...controllers];
        return this;
    }
    bind(callback) {
        const boundList = [];
        // create scoped functions class-first and push to list
        for (const ctrl of this.controllers) {
            const { gid, clazz } = ctrl;
            const inst = this.container.hasGid(gid)
                ? this.container.resolveGid(gid)
                : new clazz();
            let { path: pathPrefix, methods: defaultMethods, headers: defaultHeaders, } = ctrl.metadata[0];
            if (!pathPrefix) {
                pathPrefix = "";
            }
            if (!defaultMethods) {
                defaultMethods = ["GET"];
            }
            if (!defaultHeaders) {
                defaultHeaders = {};
            }
            for (const methodName of Object.keys(ctrl.methods)) {
                const methodDecorators = ctrl.methods[methodName];
                for (const meta of methodDecorators.metadata) {
                    let { type, path, methods, headers, priority } = meta;
                    methods = methods !== null && methods !== void 0 ? methods : defaultMethods;
                    if (!headers) {
                        headers = { ...defaultHeaders };
                    }
                    path =
                        type === types_1.HandlerConfigType.error
                            ? undefined
                            : path
                                ? `${pathPrefix}${path}`
                                : undefined;
                    priority = priority !== null && priority !== void 0 ? priority : 0;
                    const bound = type === types_1.HandlerConfigType.error
                        ? exports.makeErrorHandlerProxyToController(inst, methodName, methodDecorators)
                        : exports.makeRequestHandlerProxyToController(inst, methodName, methodDecorators);
                    boundList.push([
                        bound,
                        { ...meta, path, headers, methods, priority },
                        ctrl,
                    ]);
                }
            }
        }
        boundList
            .sort(([a, m1], [b, m2]) => {
            const p1 = m1.priority;
            const p2 = m2.priority;
            return p1 < p2 ? 1 : p1 > p2 ? -1 : 0;
        })
            .forEach(([bound, param, ctrl]) => callback(bound, param, ctrl));
    }
}
exports.HttpDecoratorsBinder = HttpDecoratorsBinder;
//# sourceMappingURL=binder.js.map