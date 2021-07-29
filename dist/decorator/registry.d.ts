export declare const findGidForConstructor: (t: any) => string;
/**
 * Lifecycle:
 *
 * - method/property/parameter: t is prototype; each prototype gets unique gid
 *   - wasLastClass() is false
 * - class: t is class; get prototype from t.prototype to resolve gid
 *   - wasLastClass() is true
 */
export declare const getOrMakeGidForConstructor: (t: any) => string;
export declare const getLastGid: () => string;
export declare const isSameGid: (gid: string) => boolean;
export declare const wasLastClass: () => boolean;
export declare const getConstructorForGid: (gid: string) => Function;
/**
 * If your class decorator extends base class, call this function to associate
 * the gid to the subclass (otherwise it'll always be associated with the base.)
 */
export declare const swapConstructorWithSubclass: (subclass: Function) => void;
export declare type GidAccessible = {
    getDecoratorGid(): string;
    ___gid?: string;
};
export declare const hasGidAccessor: (o: any) => o is GidAccessible;
/**
 * Gets the gid of what's assumed to be a class. If `getDecoratorGid()` exists, that value will be
 * returned, otherwise, the class will be
 */
export declare const getGid: (o: any) => any;
/**
 * Attaches `getDecoratorGid(): string` to target for convenient access to GID.
 * @todo guard against non-function?
 */
export declare const RegistryGidAccessor: <T extends new (...args: any[]) => {}>(target: T) => T & GidAccessible;
