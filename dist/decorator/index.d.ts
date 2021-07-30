/**
 * A set of helper classes/methods that make it easy to process and collect decorator
 * metadata for reflection.
 */
export declare type DecoratedParameter = {
    method: string;
    pos: number;
};
export declare enum RecordType {
    all = 1,
    clazz = 2,
    property = 3,
    method = 4,
    parameter = 5
}
/**
 * Extend metadata with key identifiers that determine scope/context of metadata.
 */
export declare type MetaDescriptor = {
    _type: RecordType;
    _provider: string;
    _decorator: string;
};
export declare type DecoratedMethod<Method extends any = any, Parameter extends any = any> = {
    metadata: (MetaDescriptor & Method)[];
    parameters: (MetaDescriptor & Parameter)[][];
};
/**
 * A convenient structure encapsulating all class decorations.
 */
export declare type DecoratedClass<Clazz extends any = any, Method extends any = any, Property extends any = any, Parameter extends any = any> = MetaDescriptor & {
    gid: string;
    clazz: any;
    metadata: (MetaDescriptor & Clazz)[];
    methods: Record<string, DecoratedMethod<Method, Parameter>>;
    staticMethods: Record<string, DecoratedMethod<Method, Parameter>>;
    properties: Record<string, (MetaDescriptor & Property)[]>;
    staticProperties: Record<string, (MetaDescriptor & Property)[]>;
};
/**
 * Generates an empty structure with given gid.
 */
export declare const getEmptyDecoratedClass: <Clazz extends object = any, Method extends object = any, Parameter extends object = any, Property extends object = any>(gid: string, provider: string) => DecoratedClass<Clazz, Method, Parameter, Property>;
export declare type BundleIdAccessible = {
    getBundleId(): string;
};
export declare const hasBundleId: (o: any) => o is BundleIdAccessible;
/**
 * Gets the gid of what's assumed to be a class. If `getDecoratorGid()` exists, that value will be
 * returned, otherwise, the class will be
 */
export declare const getBundleId: (o: any) => string | undefined;
/**
 * Returns a decorator that marks class as belonging to bundle identified by id. This allows you to
 * easily group and identify related classes in a module.
 *
 * ```
 * // e.g. setup base decorator for your bundle
 * const MyApp = BundleDecoratorFactory('myapp');
 *
 * @MyApp
 * class Service {}
 * ```
 *
 */
export declare const BundleDecoratorFactory: (id: string) => (t: any) => void;
export declare type BundleEntry = {
    id: string;
    metadata: DecoratedClass[];
};
export declare const getGlobalDecoratedClasses: (filter?: ((rec: DecoratedClass) => boolean) | undefined) => DecoratedClass[];
export declare const getBundledMetadata: (id: string) => BundleEntry;
export declare const getGidsForBundle: (id: string) => string[];
export declare const getManyBundlesMetadata: (ids: string[]) => BundleEntry[];
/**
 * Most common use case -- get the metadata of all bundles as a single list.
 */
export declare const flattenManyBundlesMetadata: (ids: string[]) => DecoratedClass[];
/**
 * Given an input list of metadata, only return the ones for specified provider. E.g.
 * `filterMetadataByProvider([{_provider:'http'},{_provider: 'service-container'}], 'http')`
 * returns `[{_provider:'http'}]`
 */
export declare const filterMetadataByProvider: (metadata: any[], provider: string) => any[];
export declare const filterByDecorator: (metadata: any[], decorator: string) => any[];
export declare const duplicateDecoratorsForGid: (gid: string, newGid: string) => void;
/**
 * Iteratively construct a class tree of decorators for easy in-process and post-
 * process introspection. This is a concrete and easy-to-work-with alternative
 * to reflect-metadata with extra benefits (e.g. annotation libs can expose
 * their metadata via gid).
 *
 * This also populates the global registry as well as bundle registry, which you
 * can access from the above exposed methods.
 */
export declare class DecoratedClassBuilder<Clazz extends object = any, Method extends object = any, Parameter extends object = any, Property extends object = any> {
    curGid: string;
    cur: DecoratedClass;
    private finalized;
    private map;
    private provider;
    private changeTicks;
    constructor(provider: string);
    getChangeTicks(): number;
    protected checkProto(proto: any): void;
    getByGid(gid: string): DecoratedClass<any, any, any, any>;
    initProperty(name: string, isStatic: boolean, metadata: Property, decorator: string): void;
    pushProperty(proto: any, name: string, metadata: Property, decorator?: string): void;
    initMethod(name: string, isStatic: boolean): void;
    pushMethod(proto: any, name: string, metadata: Method, decorator?: string): void;
    initParameter(methodName: string, pos: number, isStatic: boolean): void;
    pushParameter(proto: any, methodName: string, pos: number, metadata: Parameter, decorator?: string): void;
    pushClass(clazz: any, metadata: Clazz, decorator?: string): void;
    getFinalized(): DecoratedClass<Clazz, Method, Parameter, Property>[];
    bundleDeclared(id: string, t: any): void;
}
