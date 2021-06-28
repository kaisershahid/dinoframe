import { Request, Response } from 'express';
import { readFileSync } from 'fs';
import { getHttpAnnotations, proxyRequestHandlerToRoute } from './decorators';
import { ExampleController } from './__fixtures/example-controller';

describe('module: http.decorator', () => {
	it('collects expected metadata for ExampleController', () => {
		// @todo static gid in json may change as annotated controllers grow
		const http = getHttpAnnotations();
		const JSON_ANNOTATIONS = readFileSync(
			`${__dirname}/__fixtures/example-controller.json`
		).toString();
		expect(JSON.parse(JSON_ANNOTATIONS)).toMatchObject(
			JSON.parse(JSON.stringify(http[0]))
		);
	});

	describe('#proxyRequestHandlerToRoute() using ExampleController', () => {
		const annotations = getHttpAnnotations();
		const controller = new ExampleController();
		const request = {
			query: {},
		} as Request;
		const response = {} as Response;

		let err: any;
		const next = (e?: any) => {
			err = e;
		};

		beforeEach(() => {
			err = undefined;
		});

		const p1Injected = proxyRequestHandlerToRoute(
			controller,
			'p1Injected',
			annotations[0].methods['p1Injected']
		);

		it('injects p1', () => {
			request.query = { p1: 'hello' };
			const val = p1Injected(request, response, next);
			expect(val).toEqual('hello');
		});

		const p1Required = proxyRequestHandlerToRoute(
			controller,
			'p1Required',
			annotations[0].methods['p1Required']
		);

		it('fails p1 because of required', () => {
			request.query = {};
			p1Required(request, response, next);
			expect(err.message).toEqual('p1: required');
		});

		const p1Enum = proxyRequestHandlerToRoute(
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

		const p1ValidatorTransformer = proxyRequestHandlerToRoute(
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
});
