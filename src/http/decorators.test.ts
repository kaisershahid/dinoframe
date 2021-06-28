import { Request, Response } from 'express';
import { readFileSync } from 'fs';
import { getHttpAnnotations} from './decorators';
import { ExampleController } from './__fixtures/example-controller';
import {proxyRequestHandlerToRoute} from "./binder";

describe('module: http.decorator', () => {
	it('collects expected metadata for ExampleController', () => {
		// @todo static gid in json may change as annotated controllers grow -- need more agnostic check
		const http = getHttpAnnotations();
		const JSON_ANNOTATIONS = readFileSync(
			`${__dirname}/__fixtures/example-controller.json`
		).toString();
		expect(JSON.parse(JSON_ANNOTATIONS)).toMatchObject(
			JSON.parse(JSON.stringify(http[0]))
		);
	});
});
