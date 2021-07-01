import {Controller, ErrorMiddleware, Middleware, RequestParam, Route} from "../../http/decorators";
import {BundleDecoratorFactory} from "../../decorator";
import {Request} from "express";
import {Inject, Service} from "../../service-container/decorators";
import {TrivialService} from "./services";

const ControllerBundle = BundleDecoratorFactory('example-app.controllers')

/**
 * Since this controller has `@Service` declared, service injection will take place
 * that then becomes available in the routes.
 */
@ControllerBundle
@Controller({
    methods: ['post']
})
@Service('controller.upload')
export class UploadController {
    private trivial: TrivialService|undefined;

    setTrivialService(@Inject({id:'trivial'}) trivial: TrivialService) {
        this.trivial = trivial;
    }

    @Route({path: '/upload'})
    doUpload(req, res, next) {
        res.send({'status': 'upload complete', trivial: this.trivial?.getName()});
    }

    @Route({path: '/upload', methods: ['get']})
    viewUpload(req, res, next, @RequestParam('uploadId') uploadId) {
        res.send({uploadId})
    }

    @Middleware({priority: 100})
    checkAuthorization(req: Request, res, next) {
        if (req.headers['throw-error'] == 'true') {
            next(new Error('throw-error set in header'));
        } else {
            next();
        }
    }

    @ErrorMiddleware({priority: -1000})
    handleError(e, req, res, next) {
        res.statusCode = 500;
        res.send({error: e.message})
    }

    static discover() {
        return 'example-app.controllers'
    }
}
