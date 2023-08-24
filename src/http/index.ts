export * from './types';
export * from './decorators';
export * from './utils';
export * from './binder';
import { Factory, Inject, Service } from '../service-container/decorators';
import express from 'express';
import * as http from 'http';
import { BundleDecoratorFactory } from '../decorator';

export const PROVIDER_ID = 'dinoframe.http';
export const HttpBundle = BundleDecoratorFactory(PROVIDER_ID);

/**
 * Designated bundle entrypoint
 */
@HttpBundle
@Service('express.app')
export class ExpressApp {
	@Factory
	static getInstance() {
		return express();
	}

	static discover() {
		[HttpServer];
		return PROVIDER_ID;
	}
}

@HttpBundle
@Service('http.server')
export class HttpServer {
	@Factory
	static getInstance(
		@Inject({ id: 'express.app' }) app: express.Application
	) {
		return http.createServer(app);
	}
}
