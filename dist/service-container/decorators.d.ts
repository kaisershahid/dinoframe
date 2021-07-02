import { BaseServiceMeta, DecoratedServiceRecord, DependencyMeta } from "./types";
export declare const Service: (id: string, meta?: BaseServiceMeta) => (clazz: any) => void;
/**
 * Method -- if defined, expected to return service instance. Necessary to mark
 * if you need to inject dependencies via constructor.
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
 * Class -- marks a service as a factory for creating scoped instances.
 * @todo
 */
export declare const ServiceFactory: (id: any) => void;
/**
 * Returns ALL processed @Service as DecoratedServiceRecord instances
 */
export declare const getDecoratedServiceRecords: () => DecoratedServiceRecord[];
