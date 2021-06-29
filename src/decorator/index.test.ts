import { DecoratedClassBuilder } from './index';
import { getOrMakeGidForConstructor, GidEnabledClass } from './registry';
import exp = require("constants");

type ClassMeta = {
	name: string;
};

type MethodMeta = {
	name: string;
	validate: boolean;
	desc: PropertyDescriptor;
};

type ParameterMeta = {
	matchRegex: RegExp;
	pos: number;
};

const collector = new DecoratedClassBuilder<
	ClassMeta,
	MethodMeta,
	ParameterMeta
>();

const ClassDecorator = (params: { name: string }) => {
	return (target: any) => {
		collector.pushClass(target, params);
	};
};

const MethodDecorator = (params: { validate: boolean }) => {
	return (proto: any, name: string, desc: PropertyDescriptor) => {
		collector.pushMethod(proto, name, { name, desc, ...params });
		const methDef = collector.cur.methods[name];
		desc.value = (...args: any[]) => {
			for (let i = 0; i < args.length; i++) {
				if (methDef.parameters[i]) {
					for (const rule of methDef.parameters[
						i
					] as ParameterMeta[]) {
						if (!rule.matchRegex.test(args[i])) {
							throw new Error(
								`${i} - ${args[i]} did not match ${rule.matchRegex}`
							);
						}
					}
				}
			}
		};
	};
};

const PropertyDecorator = () => {
	return (proto: any, name: string, desc?: any) => {};
};

const ParameterDecorator = (params: { matchRegex: RegExp }) => {
	return (proto: any, method: string, pos: number) => {
		collector.pushParameter(proto, method, pos, { pos, ...params });
	};
};

@ClassDecorator({ name: 'Example' })
class Example {
	@MethodDecorator({ validate: true })
	method1(
		@ParameterDecorator({ matchRegex: /hello/ }) param: string,
		@ParameterDecorator({ matchRegex: /^bye!?$/ }) param2 = ''
	) {}

	@PropertyDecorator()
	prop1 = 5;

	@MethodDecorator({validate: false})
	static method2() {
	}
}

@ClassDecorator({ name: 'Example2' })
class Example2 {}

describe('module: decorator', () => {
	describe('DecoratedClassBuilder', () => {
		const finalized = collector.getFinalized();
		it('processes Example', () => {
			const record = finalized[0];
			expect(record.gid).toEqual('1');
			expect(record.metadata[0].name).toEqual('Example');
			expect(record.methods['method1']).not.toBeUndefined();
			expect(record.methods['method1'].parameters[0].length).toEqual(1);
			expect(
				record.methods['method1'].parameters[0][0].matchRegex
			).toEqual(/hello/);
			expect(record.staticMethods['method2']).not.toBeUndefined();
			expect(record.staticMethods['method2'].metadata[0].validate).toEqual(false);
		});

		it('processes Example2', () => {
			const record = finalized[1];
			expect(record.gid).toEqual('2');
			expect(record.metadata[0].name).toEqual('Example2');
			expect(Object.keys(record.methods).length).toEqual(0);
			expect(Object.keys(record.properties).length).toEqual(0);
		});
	});

	describe('modifying class behavior of Example', () => {
		const ex1 = new Example();
		it(`successfully runs method1('hello')`, () => {
			ex1.method1('hello');
		});

		it(`fails method1('hell')`, () => {
			try {
				ex1.method1('hell');
				throw 'expected-error';
			} catch (e) {
				expect(e.message).toEqual('0 - hell did not match /hello/');
			}
		});

		it(`fails method1(' hello ', 'll')`, () => {
			try {
				ex1.method1(' hello ', 'll');
				throw 'expected-error';
			} catch (e) {
				expect(e.message).toEqual('1 - ll did not match /^bye!?$/');
			}
		});
	});

	describe('module: registry', () => {
		@GidEnabledClass()
		class GidClass {}

		describe('GidEnabledClass & #swapConstructorWithSubclass()', () => {
			it('extends GidClass and maps gid to subclass', () => {
				const gid = getOrMakeGidForConstructor(GidClass);
				const clazz = new GidClass() as any;
				expect(clazz.getDecoratorGid()).toEqual(gid);
			});
		});
	});
});
