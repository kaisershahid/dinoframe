import {readFileSync} from 'fs';
import {getHttpAnnotations} from './decorators';
import {ExampleController} from "./__fixtures/example-controller";
import {RecordType} from "../decorator";

describe('module: http.decorator: verification of ExampleController', () => {
    ExampleController.discover();
	const annotations = getHttpAnnotations()[0];

	it('processes @Controller', () => {
        expect(annotations.metadata[0]).toEqual({
            _type: RecordType.clazz,
            _provider: 'http',
            _decorator: 'Controller',
            id: 'test.ExampleController',
            path: '/prefix',
            methods: ['PUT'],
        })
    });

	it('processes @Route', () => {
        const routes = Object.keys(annotations.methods);
        expect(routes.includes('doGet')).toBeTruthy();
        expect(routes.includes('p1Injected')).toBeTruthy();
        expect(routes.includes('p1Required')).toBeTruthy();
        expect(routes.includes('p1Enum')).toBeTruthy();
        expect(routes.includes('p1ValidatorTransformer')).toBeTruthy();
    });

	it('processes @RequestParam', () => {
	    const params = annotations.methods['p1ValidatorTransformer'].parameters;
	    const p1 = params[3][0];
	    const {method,pos,name} = p1;
	    expect({method,pos,name}).toEqual({
            method: 'p1ValidatorTransformer',
            pos: 3,
            name: 'p1'
        })
        expect(typeof p1.validator).toEqual('function')
        expect(typeof p1.transformer).toEqual('function')
    })
});
