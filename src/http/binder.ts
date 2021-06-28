import {AwilixContainer} from 'awilix';
import {ErrorRequestHandler, Request, RequestHandler, Response} from 'express';
import {DecoratedClass, DecoratedMethod} from '../decorator';
import {isParameterEmpty} from './decorators';
import {
	BaseDecoratorConfig,
	ControllerConfig,
	RequestParamConfig,
	RequestParamError,
	InjectedRequestParam,
	RouteConfig,
} from './types';

export const SVC_HTTP_DEFAULT = 'http.server';

export type AllowedHandler = RequestHandler | ErrorRequestHandler;

/**
 * For a given set of annotations, creates Express-compatible handlers that
 * extract injected args and call the target method on the controller.
 */
export type BoundHandlerCallback = (
	handler: AllowedHandler,
	param: BaseDecoratorConfig
) => void;

/**
 * Proxies request objects to `thisCtx.methodName` along with annotated args.
 */
export const proxyRequestHandlerToRoute = (
	thisCtx: any,
	methodName: string,
	route: DecoratedMethod<RouteConfig, InjectedRequestParam>
): RequestHandler => {
	return (request, response, next) => {
		const paramArgs = extractParametersAsArgsFromRequest(
			request,
			response,
			route
		);
		try {
			applyConstraintsToArgs(paramArgs, request, response, route);
			return (thisCtx[methodName] as Function)(
				...[request, response, next, ...paramArgs]
			);
		} catch (e) {
			next(e);
		}
	};
};

export class HttpDecoratorsBinder {
	container: AwilixContainer<any>;
	controllers: DecoratedClass<
		ControllerConfig,
		RouteConfig,
		RequestParamConfig,
		any
	>[];
	instCache: Record<string, any> = {};

	constructor(container: AwilixContainer, controllers: DecoratedClass[]) {
		this.container = container;
		this.controllers = [...controllers];
	}

	bind(callback: BoundHandlerCallback) {
		//const httpServer = this.container.resolve('http')
		const boundList: [
			RequestHandler | ErrorRequestHandler,
			BaseDecoratorConfig
		][] = [];
		// create scoped functions class-first, then sort and bind
		for (const ctrl of this.controllers) {
			const { gid, clazz } = ctrl;
			// @todo check if class exists in container
			const inst = new clazz();

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
					// @todo differentiate between route/middleware/errorMiddleware
					let { path, methods, headers, priority } = meta;
					methods = methods ?? defaultMethods;
					if (!headers) {
						headers = { ...defaultHeaders };
					}
					path = `${pathPrefix}${path}`;
					priority = priority ?? 0;
					const bound = proxyRequestHandlerToRoute(
						inst,
						methodName,
						methodDecorators
					);
					boundList.push([
						bound,
						{ ...meta, path, headers, methods, priority },
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
			.forEach(([bound, param]) => callback(bound, param));
	}
}

/**
 * Attempts to extract each arg's corresponding request parameter value. If
 * transformer is defined, apply to value. First 3 args are ignored since
 * they're expected to be request handler args.
 */
export const extractParametersAsArgsFromRequest = (
    request: Request,
    response: Response,
    route: DecoratedMethod<RouteConfig, InjectedRequestParam>
) => {
    const pushArgs: any[] = [];
    for (let i = 0; i < route.parameters.length; i++) {
        if (route.parameters[i] === undefined) {
            pushArgs[i] = undefined;
            continue;
        }

        let argVal: any = undefined;
        const params = route.parameters[i] as InjectedRequestParam[];

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

    return pushArgs.slice(3);
};
/**
 * Performs the following constraints on each argument:
 *
 * - if required and arg is empty, throw error
 * - if validator defined and fails, throw error
 * - if enumValues set and fails, throw error
 */
export const applyConstraintsToArgs = (
	args: any[],
	request: Request,
	response: Response,
	route: DecoratedMethod<RouteConfig, InjectedRequestParam>
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
