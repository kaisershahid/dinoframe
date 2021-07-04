import {
  BaseServiceMeta,
  DecoratedServiceRecord,
  DependencyMeta,
  getServiceMetadataBuilder,
  MethodType,
} from "./types";
import { getOrMakeGidForConstructor } from "../decorator/registry";

const builder = getServiceMetadataBuilder();

/**
 * Class -- marks the class as a singleton service. If `isFactory` is true, service is treated as
 * a sub-service factory. Don't confuse with `@Factory`.
 */
export const Service = (id: string, meta: BaseServiceMeta = {}) => {
  return (clazz: any) => {
    builder.pushClass(
      clazz,
      { id, gid: getOrMakeGidForConstructor(clazz), ...meta },
      "Service"
    );
  };
};

/**
 * Method (static) -- if defined, expected to return service instance. Necessary if you prefer to use
 * constructor injection.
 */
export const Factory = (
  target: any,
  name: string,
  desc: PropertyDescriptor
) => {
  builder.pushMethod(
    target,
    name,
    { type: MethodType.factory, name },
    "Factory"
  );
};

/**
 * Method -- if defined, invoked before service is marked as active. error blocks
 * dependents.
 */
export const Activate = (
  target: any,
  name: string,
  desc: PropertyDescriptor
) => {
  builder.pushMethod(
    target,
    name,
    { type: MethodType.activate, name },
    "Activate"
  );
};

/**
 * Method -- invoked on shutdown. error is logged as error; does not block dependents.
 */
export const Deactivate = (
  target: any,
  name: string,
  desc: PropertyDescriptor
) => {
  builder.pushMethod(
    target,
    name,
    { type: MethodType.deactivate, name },
    "Deactivate"
  );
};

/**
 * Class -- defines a dependency as service id or 1+ interfaces to match.
 */
export const Dependency = (params: DependencyMeta) => {
  return (target: any) => {
    // @todo need a more parameterized way to insert different types of same rec class
  };
};

/**
 * Parameter (extends behavior of @Dependency) --  injects dependency into argument
 */
export const Inject = (params: DependencyMeta) => {
  return (target: any, name: string, pos: number) => {
    builder.pushParameter(target, name, pos, { ...params }, "Inject");
  };
};

/**
 * Returns ALL processed @Service as DecoratedServiceRecord instances
 */
export const getDecoratedServiceRecords = () => {
  return builder.getFinalized().map((meta) => {
    return new DecoratedServiceRecord(meta);
  });
};
