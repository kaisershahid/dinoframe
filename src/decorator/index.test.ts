import {DecoratedClassBuilder, getBundledMetadata} from './index';
import {getOrMakeGidForConstructor, RegistryGidAccessor} from './registry';
import {BundleDecoratorFactory} from "./bundle";

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

const decBuilder = new DecoratedClassBuilder<
	ClassMeta,
	MethodMeta,
	ParameterMeta
>('test');

const DecoratorTestBundle = BundleDecoratorFactory('dinoframe.decorator.test', decBuilder);
const DecoratorTestBundle2 = BundleDecoratorFactory('dinoframe.decorator.example2.test', decBuilder);

const ClassDecorator = (params: { name: string }) => {
	return (target: any) => {
		decBuilder.pushClass(target, params, 'C');
	};
};

const MethodDecorator = (params: { validate: boolean }) => {
	return (proto: any, name: string, desc: PropertyDescriptor) => {
		decBuilder.pushMethod(proto, name, { name, desc, ...params }, 'M1');
		const methDef = decBuilder.cur.methods[name];
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

const MethodDecorator2 = (proto: any, name: string, desc: PropertyDescriptor) => {
	decBuilder.pushMethod(proto, name, { name, desc, validate: false }, 'M2');
};

const PropertyDecorator = () => {
	return (proto: any, name: string, desc?: any) => {
		decBuilder.pushProperty(proto, name, {desc}, 'Prop1');
	};
};

const ParameterDecorator = (params: { matchRegex: RegExp }) => {
	return (proto: any, method: string, pos: number) => {
		decBuilder.pushParameter(proto, method, pos, { pos, ...params }, 'Param1');
	};
};

const ParameterDecorator2 = () => {
	return (proto: any, method: string, pos: number) => {
		decBuilder.pushParameter(proto, method, pos, { pos, matchRegex: /-/ }, 'Param2');
	};
};

@DecoratorTestBundle
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

@DecoratorTestBundle2
@ClassDecorator({ name: 'Example2' })
class Example2 {
	private _x:boolean;
	private _y:boolean;

	constructor(props) {
		this._x = false;
		this._y = true;
	}

	@MethodDecorator2
	get x() {
		return this._x;
	}

	@MethodDecorator2
	get y() {
		return this._y;
	}
}

describe('module: decorator', () => {
	describe('DecoratedClassBuilder', () => {
		const finalized = decBuilder.getFinalized();
		it('processes Example', () => {
			const record = finalized[0];
			expect(record.gid).toEqual('1');
			expect(record.metadata[0].name).toEqual('Example');
			expect(record.methods['method1']).not.toBeUndefined();
			expect(record.methods['method1'].metadata[0]._provider).toEqual('test')
			expect(record.methods['method1'].metadata[0]._decorator).toEqual('M1')
			expect(record.methods['method1'].parameters[0].length).toEqual(1);
			expect(
				record.methods['method1'].parameters[0][0].matchRegex
			).toEqual(/hello/);
			expect(record.staticMethods['method2']).not.toBeUndefined();
			expect(record.staticMethods['method2'].metadata[0].validate).toEqual(false);
			expect(record.staticMethods['method2'].metadata[0]._provider).toEqual('test')
			expect(record.staticMethods['method2'].metadata[0]._decorator).toEqual('M1')

			expect(record.properties['prop1']).not.toBeUndefined();
		});
		it('dinoframe.decorator.test bundle only contains Example', () => {
			const {metadata} = getBundledMetadata('dinoframe.decorator.test');
			expect(metadata.length).toEqual(1);
			expect(metadata[0].metadata[0].name).toEqual('Example')
		})

		it('processes Example2', () => {
			const record = finalized[1];
			expect(record.gid).toEqual('2');
			expect(record.metadata[0].name).toEqual('Example2');
			expect(Object.keys(record.methods).length).toEqual(2);
			expect(record.methods['x']).not.toBeUndefined();
			expect(record.methods['x'].metadata[0]._provider).toEqual('test')
			expect(record.methods['x'].metadata[0]._decorator).toEqual('M2')
			expect(record.methods['y']).not.toBeUndefined();
			expect(record.methods['y'].metadata[0]._provider).toEqual('test')
			expect(record.methods['y'].metadata[0]._decorator).toEqual('M2')
			expect(Object.keys(record.properties).length).toEqual(0);
		});
		it('dinoframe.decorator.example2.test bundle only contains Example2', () => {
			const {metadata} = getBundledMetadata('dinoframe.decorator.example2.test');
			expect(metadata.length).toEqual(1);
			expect(metadata[0].metadata[0].name).toEqual('Example2')
		})
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
		@RegistryGidAccessor
		class GidClass {}

		describe('GidEnabledClass & #swapConstructorWithSubclass()', () => {
			it('extends GidClass and maps gid to subclass', () => {
				const gid = getOrMakeGidForConstructor(GidClass);
				expect((GidClass as any).getDecoratorGid()).toEqual(gid);
			});
		});
	});
});
