import {
	AllowedHandler,
	HttpDecoratorsBinder,
	makeErrorHandlerProxyToController,
	makeRequestHandlerProxyToController
} from './binder';
import {createContainer} from 'awilix';
import {getHttpAnnotations} from './decorators';
import {ExampleController} from './__fixtures/example-controller';
import {Request, RequestHandler, Response,} from 'express';

describe('module: http.binder: HttpDecoratorsBinder', () => {
	ExampleController.discover();
	const container = createContainer();
	const annotations = getHttpAnnotations();
	const binder = new HttpDecoratorsBinder(container, annotations);
	const boundList: AllowedHandler[] = [];
	const controller = new ExampleController();

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
	let err: any;
	const next = (e?: any) => {
		err = e;
	};

	it('correctly executes /p1Enum', () => {
		let err: any;
		const next = (e?: any) => {
			err = e;
		};

		(boundList[0] as RequestHandler)(request, response, next);
		expect(err.message).toEqual('p1: got undefined; expected: ["1","2"]');
	});

	describe('#makeRequestHandlerProxyToController() using ExampleController', () => {
		beforeEach(() => {
			err = undefined;
		});

		const p1Injected = makeRequestHandlerProxyToController(
			controller,
			'p1Injected',
			annotations[0].methods['p1Injected']
		);

		it('injects p1', () => {
			request.query = { p1: 'hello' };
			const val = p1Injected(request, response, next);
			expect(val).toEqual('hello');
		});

		const p1Required = makeRequestHandlerProxyToController(
			controller,
			'p1Required',
			annotations[0].methods['p1Required']
		);

		it('fails p1 because of required', () => {
			request.query = {};
			p1Required(request, response, next);
			expect(err.message).toEqual('p1: required');
		});

		const p1Enum = makeRequestHandlerProxyToController(
			controller,
			'p1Enum',
			annotations[0].methods['p1Enum']
		);

		it('fails p1 because of invalid enum', () => {
			request.query = { p1: '1' };
			p1Enum(request, response, next);
			request.query = { p1: '3' };
			p1Enum(request, response, next);
			expect(err.message).toEqual(`p1: got 3; expected: ["1","2"]`);
		});

		const p1ValidatorTransformer = makeRequestHandlerProxyToController(
			controller,
			'p1ValidatorTransformer',
			annotations[0].methods['p1ValidatorTransformer']
		);

		it('transforms p1 to valid value', () => {
			request.query = { p1: 'not-error' };
			const val = p1ValidatorTransformer(request, response, next);
			expect(val).toEqual('not-error!');
		});

		it('transforms p1 to valid value then fails', () => {
			request.query = { p1: 'to-error' };
			p1ValidatorTransformer(request, response, next);
			expect(err.message).toEqual('p1: err set');
		});


	});

	describe('#makeErrorHandlerProxyToController', function () {
		beforeEach(() => {
			err = undefined;
		});

		const errorHandler = makeErrorHandlerProxyToController(
			controller,
			'errorHandler',
			annotations[0].methods['errorHandler']
		);

		it('has 4 args', () => {
			expect(errorHandler.length).toEqual(4);
		})

		it('extracts and transforms params without validation', () => {
			request.query = {p1: 'hi'};
			const ret = errorHandler('error!', request, response, next);
			expect(ret).toEqual({
				err: 'error!',
				p1: 'hi!'
			})
		})
	});
});
