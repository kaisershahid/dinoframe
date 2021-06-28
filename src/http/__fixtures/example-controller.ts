import {Controller, ErrorMiddleware, Middleware, RequestParam, Route} from '../decorators';

@Controller({
    id: 'test.ExampleController',
    path: '/prefix',
    methods: ['PUT'],
})
export class ExampleController {
    @Route({
        path: '/get',
        methods: ['GET'],
        priority: -1,
    })
    doGet() {
    }

    @Route({path: '/p1-injected', priority: -50})
    p1Injected(request, response, next, @RequestParam({name: 'p1'}) p1?) {
        return p1;
    }

    @Route({path: '/p1-required'})
    p1Required(
        request,
        response,
        next,
        @RequestParam({name: 'p1', required: true}) p1?: any
    ) {
    }

    @Route({path: '/p1-enum', priority: 100})
    p1Enum(
        request,
        response,
        next,
        @RequestParam({name: 'p1', enumValues: ['1', '2']}) p1?
    ) {
    }

    @Route({path: '/p1-validator-transformer', priority: 88})
    p1ValidatorTransformer(
        request,
        response,
        next,
        @RequestParam({
            name: 'p1',
            transformer: (val: any) => {
                if (val === 'to-error') {
                    return 'err';
                }
                return val + '!';
            },
            validator: (val: any, ctx) => {
                if (val == 'err') {
                    return 'err set';
                }
                return;
            },
        })
            p1?
    ) {
        return p1;
    }

    @Middleware()
    middleware(request, response, next) {
    }

    @ErrorMiddleware()
    errorHandler(err: any, request, response, next, @RequestParam({name: 'p1', transformer: (v) => v + '!', validator: (v) => {
            throw new Error('fail')
        }}) p1) {
        return {err, p1};
    }


    static discover() {
    }
}
