import { Request, Response } from 'express';
import { DecoratedParameter } from '../decorator';

export type BaseDecoratorParams = {
	[key: string]: any;
	priority?: number;
	path?: string;
	methods?: string[];
	headers?: Record<string, HeaderRecord>;
	__type?: number;
};

export type RouteParams = BaseDecoratorParams & {
	path: string;
	parameters?: Record<string, ParameterRecord>;
	body?: BodyRecord;
	response?: ResponseRecord;
};

export type MiddlewareParams = BaseDecoratorParams & {};

export type ErrorMiddlewareParams = BaseDecoratorParams & {};

export type ControllerParams = BaseDecoratorParams & {
	deserializer?: any;
};

export type InjectableParamContext = {
	request: Request;
	response: Response;
	def: InjectableParam;
};

export type InjectableParamValidator = (
	value: any,
	context: InjectableParamContext
) => string | undefined;

export type InjectableParamTransformer = (
	value: any,
	context: InjectableParamContext
) => any;

export type InjectableParam = {
	name: string;
	required?: boolean;
	enumValues?: any[];
	validator?: InjectableParamValidator;
	transformer?: InjectableParamTransformer;
};

export type InjectedParams = DecoratedParameter & InjectableParam;

export class InjectableParamError extends Error {
	params: InjectableParam;

	constructor(message, params: InjectableParam) {
		super(message);
		this.params = params;
	}
}

// @TODO clean below

export enum HandlerType {
	route = 1,
	middleware = 2,
	error = 3,
}

export type HeaderRecord = {
	name?: string;
	values?: string[];
	description?: string;
	required?: boolean;
};

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
	type: HandlerType;
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
	params: RouteParams | BaseDecoratorParams;
	type: HandlerType;
	invokeName: string;
	gid: string;
	desc: PropertyDescriptor;
};
