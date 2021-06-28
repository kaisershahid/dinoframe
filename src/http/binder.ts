import { AwilixContainer } from 'awilix';
import { ErrorRequestHandler, Handler, RequestHandler } from 'express';
import { DecoratedClass } from '../decorator';
import { proxyRequestHandlerToRoute } from './decorators';
import {
	BaseDecoratorParams,
	ControllerParams,
	InjectableParam,
	RouteParams,
} from './types';

export const SVC_HTTP_DEFAULT = 'http.server';

export type AllowedHandler = RequestHandler | ErrorRequestHandler;

/**
 * For a given set of annotations, creates Express-compatible handlers that
 * extract injected args and call the target method on the controller.
 */
export type BoundHandlerCallback = (
	handler: AllowedHandler,
	param: BaseDecoratorParams
) => void;

export class HttpDecoratorsBinder {
	container: AwilixContainer<any>;
	controllers: DecoratedClass<
		ControllerParams,
		RouteParams,
		InjectableParam,
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
			BaseDecoratorParams
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
