import { DecoratedMorphClass, MorpherManager, MorphParams, PropertyParams } from "./types";
import { MorphMarshaller } from "./index";
/**
 * Class -- marks a class as being morphable.
 */
export declare const Morph: (params?: MorphParams) => (target: any) => void;
/**
 * Property -- the property to map a source value onto.
 */
export declare const Property: (params?: Partial<PropertyParams>) => (target: any, name: string) => void;
/**
 * Method -- the setter for property with given name. Overrides @Property for set.
 */
export declare const PropertySet: (name: string) => (target: any, methodName: string, desc: PropertyDescriptor) => void;
/**
 * Method -- the getter for property with given name. Overides @Property for get.
 */
export declare const PropertyGet: (name: string) => (target: any, methodName: string, desc: PropertyDescriptor) => void;
/**
 * Method -- if defined, the method is invoked after deserialization to allow any necessary cleanup
 * steps and also do more complex validation. If instance fails deserialization, should throw
 * `ObjectError`
 */
export declare const Finalize: (target: any, methodName: string, desc: PropertyDescriptor) => void;
/**
 * Method -- if defined, defers all serialization to this method and should have the signature
 * `(morphManager?: MorpherManager<any>)`.
 */
export declare const Serialize: (target: any, methodName: string, desc: PropertyDescriptor) => void;
/**
 * Method -- if defined, defers all deserialization to this method and should have the signature
 * `(source: any, morphManager?: MorpherManager<any>)`.
 */
export declare const Deserialize: (target: any, methodName: string, desc: PropertyDescriptor) => void;
export declare const getMorpherDefinitions: () => DecoratedMorphClass[];
export declare const getMorpherDefByGid: (clazzOrGid: any) => import("..").DecoratedClass<any, any, any, any> | undefined;
export declare const getMorphManager: () => MorpherManager<MorphMarshaller<any>>;
export declare const getMorpherById: (clazzOrGid: any) => MorphMarshaller<any> | undefined;
