import {
    BaseServiceMeta,
    ClassServiceMetadata, DecoratedServiceRecord,
    DependencyMeta,
    getServiceMetadataBuilder,
    MethodType,
    ServiceRecord,
    ServiceState
} from "./types";
import {getOrMakeGidForConstructor} from "../decorator/registry";

const collector = getServiceMetadataBuilder();

export const Service = (id: string, meta: BaseServiceMeta = {}) => {
    return (clazz: any) => {
        collector.pushClass(clazz, {id, gid: getOrMakeGidForConstructor(clazz), ...meta})
    }
}

/**
 * Method -- if defined, expected to return service instance. Necessary to mark
 * if you need to inject dependencies via constructor.
 */
export const Factory = (target: any, name: string, desc: PropertyDescriptor) => {
    collector.pushMethod(target, name, {type: MethodType.factory, name});
}

/**
 * Method -- if defined, invoked before service is marked as active. error blocks
 * dependents.
 */
export const Activate = (target: any, name: string, desc: PropertyDescriptor) => {
    collector.pushMethod(target, name, {type: MethodType.activate, name});
}

/**
 * Method -- invoked on shutdown. error is logged as error; does not block dependents.
 */
export const Deactivate = (target: any, name: string, desc: PropertyDescriptor) => {
    collector.pushMethod(target, name, {type: MethodType.deactivate, name});
}

/**
 * Class -- defines a dependency as service id or 1+ interfaces to match.
 */
export const Dependency = (params: DependencyMeta) => {
    return (target: any) => {
        // @todo need a more parameterized way to insert different types of same rec class
    }
}

/**
 * Parameter (extends behavior of @Dependency) --  injects dependency into argument
 */
export const Inject = (params: DependencyMeta) => {
    return (target: any, name: string, pos: number) => {
        collector.pushParameter(target, name, pos, {...params})
    }
}

/**
 * Class -- marks a service as a factory for creating scoped instances.
 * @todo
 */
export const ServiceFactory = (id) => {
}

export const getDecoratedServiceRecords = () => {
    return collector.getFinalized().map((meta) => {
        return new DecoratedServiceRecord(meta)
    })
}
