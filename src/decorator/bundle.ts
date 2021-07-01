import {DecoratedClassBuilder} from "./index";

export type BundleIdAccessible = {
    getBundleId(): string;
};

export const hasBundleId = (o: any): o is BundleIdAccessible =>
    typeof o?.getBundleId === 'function';

/**
 * Gets the gid of what's assumed to be a class. If `getDecoratorGid()` exists, that value will be
 * returned, otherwise, the class will be
 */
export const getBundleId = (o: any): string|undefined => hasBundleId(o) ? o.getBundleId() : undefined;

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
 */
export const BundleDecoratorFactory = (id: string, builder: DecoratedClassBuilder) => {
    return (t: any) => {
        t.getBundleId = () => id;
        builder.pushClass(t, {bundleId: id}, 'Bundle')
    }
}
