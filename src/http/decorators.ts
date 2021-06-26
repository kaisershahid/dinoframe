import {
	Handler,
	NextFunction,
	Request,
	RequestHandler,
	Response,
} from 'express';
import { argv } from 'process';
import { DecoratedClassBuilder, DecoratedMethod } from '../decorator';
import {
	BaseDecoratorParams,
	ControllerParams,
	InjectableParam,
	InjectableParamContext,
	InjectableParamError,
	InjectedParams,
	RouteParams,
} from './types';

const collector = new DecoratedClassBuilder<
	ControllerParams,
	RouteParams,
	InjectedParams
>();

export const Controller = (params: ControllerParams = {}) => {
	return (target: any) => {
		collector.pushClass(target, params);
	};
};

export const isParameterEmpty = (v: any): boolean =>
	v === '' || v === undefined || v === null;

/**
 * Modifies the instance method to apply transformation/validation to injectable
 * parameters before original method is called.
 */
export const Route = (params: RouteParams) => {
	return (proto: any, name: string, desc: PropertyDescriptor) => {
		collector.pushMethod(proto, name, { name, desc, ...params });
		const methDef = collector.cur.methods[name];
		const method = (desc.value as Function) ?? (() => {});
		desc.value = (
			request: Request,
			response: Response,
			next: NextFunction
		) => {
			const pushArgs: any[] = [];
			for (let i = 0; i < methDef.parameters.length; i++) {
				// console.log(methDef);
				if (methDef.parameters[i] === undefined) {
					pushArgs[i] = undefined;
					continue;
				}

				let argVal: any = undefined;
				const params = methDef.parameters[i] as InjectedParams[];
				for (const param of params) {
					const {
						pos,
						name,
						required,
						enumValues,
						validator,
						transformer,
					} = param;
					// @todo extract from body if possible
					argVal = request.query[name];

					if (required && isParameterEmpty(argVal)) {
						throw new InjectableParamError(
							`${name}: required`,
							param
						);
					}

					const ctx = {
						request,
						response,
						def: param,
					};

					if (transformer) {
						argVal = transformer(argVal, ctx);
					}

					if (validator) {
						const errMsg = validator(argVal, ctx);
						if (errMsg) {
							throw new InjectableParamError(
								`${name}: ${errMsg}`,
								param
							);
						}
					} else if (enumValues) {
						if (!enumValues.includes(argVal)) {
							throw new InjectableParamError(
								`${name}: got ${argVal}; expected: ${JSON.stringify(
									enumValues
								)}`,
								param
							);
						}
					}

					// @todo replace request.query[name] with argVal?
				}

				pushArgs[i] = argVal;
			}

			return method(...[request, response, next, ...pushArgs.slice(3)]);
		};
	};
};

export const Param = (params: InjectableParam) => {
	return (proto: any, method: string, pos: number) => {
		collector.pushParameter(proto, method, pos, { method, pos, ...params });
	};
};

export const getHttpAnnotations = () => collector.getFinalized();

/**
 * Attempts to extract each arg's corresponding request parameter value. If
 * transformer is defined, apply to value. First 3 args are ignored since
 * they're expected to be request handler args.
 */
export const extractParametersAsArgsFromRequest = (
	request: Request,
	response: Response,
	route: DecoratedMethod<RouteParams, InjectedParams>
) => {
	const pushArgs: any[] = [];
	for (let i = 0; i < route.parameters.length; i++) {
		if (route.parameters[i] === undefined) {
			pushArgs[i] = undefined;
			continue;
		}

		let argVal: any = undefined;
		const params = route.parameters[i] as InjectedParams[];
		for (const param of params) {
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
	route: DecoratedMethod<RouteParams, InjectedParams>
) => {
	// params are argument-ordered. each param is a decoration
	for (const params of route.parameters) {
		// non-decorated args will have undefined definition
		if (!params) {
			continue;
		}

		for (const param of params) {
			const { name, required, enumValues, validator, transformer } =
				param;

			for (const arg of args) {
				if (required && isParameterEmpty(arg)) {
					throw new InjectableParamError(`${name}: required`, param);
				} else if (validator) {
					const errMsg = validator(arg, {
						request,
						response,
						def: param,
					});
					if (errMsg) {
						throw new InjectableParamError(
							`${name}: ${errMsg}`,
							param
						);
					}
				} else if (enumValues) {
					if (!enumValues.includes(arg)) {
						throw new InjectableParamError(
							`${name}: got ${arg}; expected: ${JSON.stringify(
								enumValues
							)}`,
							param
						);
					}
				}
			}
		}
	}
};

/**
 * Proxies request objects to `thisCtx.methodName` along with annotated args.
 */
export const proxyRequestHandlerToRoute = (
	thisCtx: any,
	methodName: string,
	route: DecoratedMethod<RouteParams, InjectedParams>
): RequestHandler => {
	return (request, response, next) => {
		const paramArgs = extractParametersAsArgsFromRequest(
			request,
			response,
			route
		);
		applyConstraintsToArgs(paramArgs, request, response, route);
		return (thisCtx[methodName] as Function)(
			...[request, response, next, ...paramArgs]
		);
	};
};
