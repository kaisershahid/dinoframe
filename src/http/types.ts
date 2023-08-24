import { Request, Response } from 'express';
import { DecoratedParameter } from '../decorator';

export type HeaderRecord = {
	name?: string;
	values?: string[];
	description?: string;
	required?: boolean;
};

export type BaseDecoratorConfig = {
	[key: string]: any;
	priority?: number;
	path?: string;
	methods?: string[];
	headers?: Record<string, HeaderRecord>;
};

export type RouteConfig = BaseDecoratorConfig & {
	path: string;
	/** @todo unsupported; reconcile with @RequestParam */
	parameters?: Record<string, ParameterRecord>;
	/** @todo unsupported */
	body?: BodyRecord;
	/** @todo unsupported */
	response?: ResponseRecord;
};

export type MiddlewareConfig = BaseDecoratorConfig & {};

export type ErrorMiddlewareConfig = BaseDecoratorConfig & {};

export enum HandlerConfigType {
	route = 1,
	middleware = 2,
	error = 3,
}

export type HandlerConfig = (
	| RouteConfig
	| MiddlewareConfig
	| ErrorMiddlewareConfig
) & {
	type: HandlerConfigType;
};

export type ControllerConfig = BaseDecoratorConfig & {
	/** @todo unsupported */
	deserializer?: any;
};

export type InjectableParamContext = {
	request: Request;
	response: Response;
	def: RequestParamConfig;
};

export type InjectableParamValidator = (
	value: any,
	context: InjectableParamContext
) => string | undefined;

export type InjectableParamTransformer = (
	value: any,
	context: InjectableParamContext
) => any;

export type RequestParamConfig = {
	name: string;
	required?: boolean;
	enumValues?: any[];
	validator?: InjectableParamValidator;
	transformer?: InjectableParamTransformer;
};

export type InjectedRequestParam = DecoratedParameter & RequestParamConfig;

export class RequestParamError extends Error {
	params: RequestParamConfig;

	constructor(message: string, params: RequestParamConfig) {
		super(message);
		this.params = params;
	}
}

// @TODO clean below

export type ParameterRecord = {
	name?: string;
	type?: 'string' | 'number';
	enumValues?: string[];
	description?: string;
	required?: boolean;
};

export type BodyExampleRecord = {
	description?: string;
	value: any;
};

export type BodyRecord = {
	description?: string;
	examples?: BodyExampleRecord[];
};

export type ResponseRecord = {
	headers?: Record<string, HeaderRecord>;
	body?: BodyRecord;
};

export type HandlerRecord = {
	type: HandlerConfigType;
	/** Default: `''` */
	path: string;
	/** Default: `[]` */
	methods: string[];
	headers: Record<string, HeaderRecord>;
	parameters: Record<string, ParameterRecord>;
	body?: BodyRecord;
	response?: ResponseRecord;
	/**
	 * Registration order, from highest to lowest. Default is 0.
	 */
	priority: number;
	/** The method name to invoke on the controller. */
	invokeName: string;
	constructorGid: string;
	controllerId: string;
};

type HandlerEntry = {
	params: RouteConfig | BaseDecoratorConfig;
	type: HandlerConfigType;
	invokeName: string;
	gid: string;
	desc: PropertyDescriptor;
};
