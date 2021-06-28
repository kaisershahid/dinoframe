import {DecoratedClassBuilder} from '../decorator';
import {ControllerConfig, RequestParamConfig, InjectedRequestParam, RouteConfig,} from './types';

const collector = new DecoratedClassBuilder<
	ControllerConfig,
	RouteConfig,
	InjectedRequestParam
>();

export const Controller = (params: ControllerConfig = {}) => {
	return (target: any) => {
		collector.pushClass(target, params);
	};
};

export const isParameterEmpty = (v: any): boolean =>
	v === '' || v === undefined || v === null;

/**
 * Modifies the instance method to apply transformation/validation to injectable
 * parameters before original method is called.
 */
export const Route = (params: RouteConfig) => {
	return (proto: any, name: string, desc: PropertyDescriptor) => {
		collector.pushMethod(proto, name, { name, desc, ...params });
	};
};

export const RequestParam = (params: RequestParamConfig) => {
	return (proto: any, method: string, pos: number) => {
		collector.pushParameter(proto, method, pos, { method, pos, ...params });
	};
};

export const getHttpAnnotations = () => collector.getFinalized();
