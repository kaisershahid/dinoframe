import { Request, Response } from 'express';
import {
	Controller,
	Route,
	Param,
	getHttpAnnotations,
	proxyRequestHandlerToRoute,
} from './decorators';

@Controller({
	path: '/prefix',
	methods: ['PUT'],
})
class ExampleController {
	@Route({
		path: '/get',
		methods: ['GET'],
	})
	doGet() {}

	@Route({ path: '/p1-injected' })
	p1Injected(request, response, next, @Param({ name: 'p1' }) p1?) {
		return p1;
	}

	@Route({ path: '/p1-required' })
	p1Required(
		request,
		response,
		next,
		@Param({ name: 'p1', required: true }) p1?: any
	) {}

	@Route({ path: '/p1-enum' })
	p1Enum(
		request,
		response,
		next,
		@Param({ name: 'p1', enumValues: ['1', '2'] }) p1?
	) {}

	@Route({ path: '/p1-validator-transformer' })
	p1ValidatorTransformer(
		request,
		response,
		next,
		@Param({
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
}

const JSON_ANNOTATIONS = `{
"gid": "1",
"metadata": [
  {
	"path": "/prefix",
	"methods": [
	  "PUT"
	]
  }
],
"methods": {
  "doGet": {
	"metadata": [
	  {
		"name": "doGet",
		"desc": {
		  "writable": true,
		  "enumerable": false,
		  "configurable": true
		},
		"path": "/get",
		"methods": [
		  "GET"
		]
	  }
	],
	"parameters": []
  },
  "p1Injected": {
	"metadata": [
	  {
		"name": "p1Injected",
		"desc": {
		  "writable": true,
		  "enumerable": false,
		  "configurable": true
		},
		"path": "/p1-injected"
	  }
	],
	"parameters": [
	  null,
	  null,
	  null,
	  [
		{
		  "method": "p1Injected",
		  "pos": 3,
		  "name": "p1"
		}
	  ]
	]
  },
  "p1Required": {
	"metadata": [
	  {
		"name": "p1Required",
		"desc": {
		  "writable": true,
		  "enumerable": false,
		  "configurable": true
		},
		"path": "/p1-required"
	  }
	],
	"parameters": [
	  null,
	  null,
	  null,
	  [
		{
		  "method": "p1Required",
		  "pos": 3,
		  "name": "p1",
		  "required": true
		}
	  ]
	]
  },
  "p1Enum": {
	"metadata": [
	  {
		"name": "p1Enum",
		"desc": {
		  "writable": true,
		  "enumerable": false,
		  "configurable": true
		},
		"path": "/p1-enum"
	  }
	],
	"parameters": [
	  null,
	  null,
	  null,
	  [
		{
		  "method": "p1Enum",
		  "pos": 3,
		  "name": "p1",
		  "enumValues": [
			"1",
			"2"
		  ]
		}
	  ]
	]
  },
  "p1ValidatorTransformer": {
	"metadata": [
	  {
		"name": "p1ValidatorTransformer",
		"desc": {
		  "writable": true,
		  "enumerable": false,
		  "configurable": true
		},
		"path": "/p1-validator-transformer"
	  }
	],
	"parameters": [
	  null,
	  null,
	  null,
	  [
		{
		  "method": "p1ValidatorTransformer",
		  "pos": 3,
		  "name": "p1"
		}
	  ]
	]
  }
},
"properties": {}
}`;

describe('module: http.decorator', () => {
	it('collects expected metadata for ExampleController', () => {
		const http = getHttpAnnotations();
		expect(JSON.parse(JSON_ANNOTATIONS)).toMatchObject(
			JSON.parse(JSON.stringify(http[0]))
		);
	});

	describe('#proxyRequestHandlerToRoute() using ExampleController', () => {
		const http = getHttpAnnotations();
		const controller = new ExampleController();
		const request = {
			query: {},
		} as Request;
		const response = {} as Response;
		const next = () => {};

		const p1Injected = proxyRequestHandlerToRoute(
			controller,
			'p1Injected',
			http[0].methods['p1Injected']
		);

		it('injects p1', () => {
			request.query = { p1: 'hello' };
			const val = p1Injected(request, response, next);
			expect(val).toEqual('hello');
		});

		const p1Required = proxyRequestHandlerToRoute(
			controller,
			'p1Required',
			http[0].methods['p1Required']
		);

		it('fails p1 because of required', () => {
			request.query = {};
			try {
				p1Required(request, response, next);
			} catch (e) {
				expect(e.message).toEqual('p1: required');
			}

			expect.assertions(1);
		});

		const p1Enum = proxyRequestHandlerToRoute(
			controller,
			'p1Enum',
			http[0].methods['p1Enum']
		);

		it('fails p1 because of invalid enum', () => {
			request.query = { p1: '1' };
			p1Enum(request, response, next);

			try {
				request.query = { p1: '3' };
				p1Enum(request, response, next);
			} catch (e) {
				expect(e.message).toEqual(`p1: got 3; expected: ["1","2"]`);
			}

			expect.assertions(1);
		});

		const p1ValidatorTransformer = proxyRequestHandlerToRoute(
			controller,
			'p1ValidatorTransformer',
			http[0].methods['p1ValidatorTransformer']
		);

		it('transforms p1 to valid value', () => {
			request.query = { p1: 'not-error' };
			const val = p1ValidatorTransformer(request, response, next);
			expect(val).toEqual('not-error!');
		});

		it('transforms p1 to valid value then fails', () => {
			request.query = { p1: 'to-error' };
			try {
				p1ValidatorTransformer(request, response, next);
			} catch (e) {
				expect(e.message).toEqual('p1: err set');
			}

			expect.assertions(1);
		});
	});
});
