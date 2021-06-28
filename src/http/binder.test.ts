import { AllowedHandler, HttpDecoratorsBinder } from './binder';
import { createContainer } from 'awilix';
import { getHttpAnnotations } from './decorators';
import { ExampleController } from './__fixtures/example-controller';
import {
	NextFunction,
	Request,
	RequestHandler,
	RequestParamHandler,
	Response,
} from 'express';

describe('module: http.binder: HttpDecoratorsBinder', () => {
	ExampleController.discover();
	const container = createContainer();
	const annotations = getHttpAnnotations();
	const binder = new HttpDecoratorsBinder(container, annotations);
	const boundList: AllowedHandler[] = [];

	it('binds handlers in priority order', () => {
		const orderedPaths: string[] = [];
		binder.bind((handler, param) => {
			boundList.push(handler);
			orderedPaths.push(param.path as string);
		});

		expect(orderedPaths).toEqual([
			'/prefix/p1-enum',
			'/prefix/p1-validator-transformer',
			'/prefix/p1-required',
			'/prefix/get',
			'/prefix/p1-injected',
		]);
	});

	const request = { query: {} } as Request;
	const response = {} as Response;

	it('correctly executes /p1Enum', () => {
		let err: any;
		const next = (e?: any) => {
			err = e;
		};

		(boundList[0] as RequestHandler)(request, response, next);
		expect(err.message).toEqual('p1: got undefined; expected: ["1","2"]');
	});
});
