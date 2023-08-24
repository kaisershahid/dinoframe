import {
	Controller,
	ErrorMiddleware,
	Middleware,
	RequestParam,
	Route,
} from '../../http/decorators';
import { BundleDecoratorFactory } from '../../decorator';
import { NextFunction, Request, Response } from 'express';
import { Inject, Service } from '../../service-container/decorators';
import { TrivialService } from './services';
import { Config } from '../../service-container/common/runtime';
import { Logger } from '../../service-container/common/logging';

const ControllerBundle = BundleDecoratorFactory('example-app.controllers');

/**
 * Since this controller has `@Service` declared, service injection will take place
 * that then becomes available in the routes.
 */
@ControllerBundle
@Controller({
	methods: ['post'],
})
@Service('controller.upload', {
	injectConfig: true,
})
export class UploadController {
	private trivial: TrivialService | undefined;
	private config: Config;
	private logger: Logger = undefined as any;

	constructor(config: Config) {
		this.config = config;
		console.log('>> got config', config.getAll());
	}

	setTrivialService(@Inject({ id: 'trivial' }) trivial: TrivialService) {
		this.trivial = trivial;
	}

	setLogger(
		@Inject({ id: 'controller@logger.loggerFactory' }) logger: Logger
	) {
		this.logger = logger;
	}

	@Route({ path: '/upload' })
	doUpload(req: Request, res: Response, next: NextFunction) {
		res.send({
			status: 'upload complete',
			trivial: this.trivial?.getName(),
		});
	}

	@Route({ path: '/upload', methods: ['get'] })
	viewUpload(
		req: Request,
		res: Response,
		next: NextFunction,
		@RequestParam('uploadId') uploadId: string
	) {
		res.send({ uploadId });
	}

	@Middleware({ priority: 100 })
	checkAuthorization(req: Request, res: Response, next: NextFunction) {
		this.logger.info(
			`incoming: ${req.method} ${req.path} ${JSON.stringify(
				req.headers,
				null,
				2
			)}`
		);
		if (req.headers['throw-error'] == 'true') {
			next(new Error('throw-error set in header'));
		} else {
			next();
		}
	}

	@ErrorMiddleware({ priority: -1000 })
	handleError(e: any, req: Request, res: Response, next: NextFunction) {
		res.statusCode = 500;
		res.send({ error: e.message });
	}

	static discover() {
		return 'example-app.controllers';
	}
}
