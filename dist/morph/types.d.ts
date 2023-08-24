import { DecoratedClass, DecoratedClassBuilder } from '../decorator';
export declare const MORPH_PROVIDER = "dinoframe.morph";
export declare class MorphError extends Error {
    constructor(message: string);
}
export declare class FieldError extends MorphError {
    constructor(message: string);
}
export declare class ObjectError extends MorphError {
    fieldErrors: Record<string, any>;
    constructor(targetName: string, errors: Record<string, any>);
}
export type ValidatorErrorMap = {
    message: string;
    [key: string]: any;
};
export type ValidatorFn = (value: any, name: string) => ValidatorErrorMap | undefined;
export type MorphParams = {
    /**
     * Indicates the class is polymorphic and defines the property name that
     * determines the final class.
     */
    discriminator?: string;
    /**
     * For subclasses in general, defines which parent class this class belongs to.
     * If the subclass is used for polymorphism, the discriminatorValue must also
     * be defined to properly associate it.
     */
    inherits?: {
        baseClass?: any;
        discriminatorValue?: string;
    };
    /**
     * If defined and not empty, omit specific properties from serialization.
     * This does not affect deserialization (i.e. you can mark a property to
     * be populated from some map but ensure it doesn't get put back into a
     * map).
     *
     * When used with polymorphism, the `ignoreProps` at each level is used to
     * filter out keys. E.g. if parent class Parent ignores ['key1'] and Child
     * ignores ['key2'], and raw serialization for Parent={key2: 'parentVal'}
     * and Child={key1: 'childKey1', key2: 'childVal'}, the final serialized
     * value would be: {key1: 'childKey1', key2: 'parentVal'}.
     */
    ignoreProps?: string[];
};
/**
 * For direct property setting, the following metadata can be specified to help
 * manage the lifecycle of the value.
 */
export type PropertyParams = {
    /**
     * The public name of this property. E.g. `title`
     */
    name: string;
    /**
     * The instance property to set the source value on.
     */
    propertyName?: string;
    /**
     * The callback function to invoke before setting.
     */
    validator?: ValidatorFn;
    /**
     * Requires key to be present and not empty based on type:
     */
    required?: boolean;
    /**
     * If specified, either validates scalar value against type or deserializes
     * value to the given class constructor.
     * @future 'object'
     */
    type?: 'boolean' | 'string' | 'number' | 'enum' | Function;
    /**
     * If defined, either allows array or scalar ('mixed') or strictly array ('strict')
     */
    listType?: 'mixed' | 'strict';
    /**
     * For enum type, the list of allowed values.
     */
    enumValues?: any[];
};
export type MethodParams = {
    /**
     * The public name of the property (e.g. 'title'). Only matters for setter/getter.
     */
    name: string;
    /**
     * Name of method to set value with. Expects 1 argument. Can throw FieldError.
     */
    setter?: string;
    /**
     * Name of getter for value. Expects 0 arguments.
     */
    getter?: string;
    /**
     * After all properties are set, invokes method for final setup and/or complex validation
     * (throw ObjectError in this case).
     */
    finalize?: string;
    /**
     * Defers all serialization to method.
     */
    serialize?: string;
    /**
     * Defers all deserialization to method. Expects 1 argument (source value map).
     */
    deserialize?: string;
};
export type TransformerPropertyDef = PropertyParams & MethodParams;
export type TransormerPropertyOverridesMap = Record<string, Partial<TransformerPropertyDef>>;
export type DecoratedMorphClass = DecoratedClass<MorphParams, MethodParams, PropertyParams>;
export declare const getMorphDecoratorBuilder: () => DecoratedClassBuilder<any, any, any, any>;
/**
 * Directly handles serialization/deserialization for a class. The `overrides` parameter allows
 * replacing rules for any desired fields -- this makes it easy to use a decorated base class
 * while allowing for context-sensitive behavior (e.g. the id field of a new object should be
 * blank on create but non-blank on update). Currently, only a single level is supported for overrides.
 */
export interface Morpher {
    deserialize<T extends any = any>(source: any, overrides?: TransormerPropertyOverridesMap): T;
    /**
     * Applies property transformation rules to given instance. This allows for updating an instance
     * initially hydrated by the morpher.
     */
    update<T extends any = any>(inst: T, source: any, overrides?: TransormerPropertyOverridesMap): any;
    serialize<T extends any = any>(source: any, overrides?: TransormerPropertyOverridesMap): Record<string, any>;
}
/**
 * Manager for all morphers within a context. Allows for uniform extension of morphers (e.g. a
 * database entity manager might enhance a list of child elements to do lazy-loading).
 */
export interface MorpherManager<MorpherType extends Morpher> {
    deserializeTo<T extends any = any>(source: any, clazz: any, overrides?: TransormerPropertyOverridesMap): T;
    serializeFrom<T extends any = any>(source: any, overrides?: TransormerPropertyOverridesMap): Record<string, any>;
    getByClassOrId(clazzOrId: any): MorpherType | undefined;
}
