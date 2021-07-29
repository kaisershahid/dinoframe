import { BaseServiceMeta, DependencyMeta } from "./types";
import { DecoratedServiceRecord } from "./utils";
/**
 * Class -- marks the class as a singleton service. If `isFactory` is true, service is treated as
 * a sub-service factory. Don't confuse with `@Factory`.
 */
export declare const Service: (id: string, meta?: BaseServiceMeta) => (clazz: any) => void;
/**
 * Method (static) -- if defined, expected to return service instance. Necessary if you prefer to use
 * constructor injection.
 */
export declare const Factory: (target: any, name: string, desc: PropertyDescriptor) => void;
/**
 * Method -- if defined, invoked before service is marked as active. error blocks
 * dependents.
 */
export declare const Activate: (target: any, name: string, desc: PropertyDescriptor) => void;
/**
 * Method -- invoked on shutdown. error is logged as error; does not block dependents.
 */
export declare const Deactivate: (target: any, name: string, desc: PropertyDescriptor) => void;
/**
 * Class -- defines a dependency as service id or 1+ interfaces to match.
 */
export declare const Dependency: (params: DependencyMeta) => (target: any) => void;
/**
 * Parameter (extends behavior of @Dependency) --  injects dependency into argument
 */
export declare const Inject: (params: DependencyMeta) => (target: any, name: string, pos: number) => void;
/**
 * Returns ALL processed @Service as DecoratedServiceRecord instances
 */
export declare const getDecoratedServiceRecords: () => DecoratedServiceRecord[];
/**
 * Registers new new through a ClassServiceMetadata object. @Service.id must
 * be unique.
 */
export declare const addNewServiceMeta: (meta: import("../decorator").DecoratedClass<import("./types").ServiceMeta, import("./types").MethodInvoker, DependencyMeta, any>) => boolean;
