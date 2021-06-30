/**
 * A set of helper classes/methods that make it easy to process and collect decorator
 * metadata for reflection.
 */

import {getOrMakeGidForConstructor} from './registry';

export type DecoratedParameter = {
    method: string;
    pos: number;
};

export enum RecordType {
    clazz = 1,
    property,
    method,
    parameter,
}

/**
 * Extend metadata with key identifiers that determine scope/context of metadata.
 */
export type MetaDescriptor = {
    _type: RecordType;
    _provider: string;
    _decorator: string;
};

export type DecoratedMethod<Method extends any = any,
    Parameter extends any = any> = {
    metadata: (MetaDescriptor & Method)[];
    parameters: (MetaDescriptor & Parameter)[][];
};

/**
 * A convenient structure encapsulating all class decorations.
 */
export type DecoratedClass<Clazz extends any = any,
    Method extends any = any,
    Property extends any = any,
    Parameter extends any = any> = {
    gid: string;
    clazz: any;
    metadata: (MetaDescriptor & Clazz)[];
    methods: Record<string, DecoratedMethod<Method, Parameter>>;
    staticMethods: Record<string, DecoratedMethod<Method, Parameter>>;
    properties: Record<string, (MetaDescriptor & Property)[]>;
    staticProperties: Record<string, (MetaDescriptor & Property)[]>;
};

// @todo globalDecoratedClass

/**
 * Generates an empty structure with given gid.
 */
export const getEmptyDecoratedClass = <Clazz extends object = any,
    Method extends object = any,
    Parameter extends object = any,
    Property extends object = any>(
    gid: string
): DecoratedClass<Clazz, Method, Parameter, Property> => {
    return {
        gid,
        clazz: undefined,
        metadata: [],
        methods: {},
        staticMethods: {},
        properties: {},
        staticProperties: {},
    };
};

/**
 * Iteratively construct a class tree of decorators for easy in-process and post-
 * process introspection. This is a concrete and easy-to-work-with alternative
 * to reflect-metadata with extra benefits (e.g. annotation libs can expose
 * their metadata via gid).
 */
export class DecoratedClassBuilder<Clazz extends object = any,
    Method extends object = any,
    Parameter extends object = any,
    Property extends object = any> {
    curGid = '';
    cur: DecoratedClass = getEmptyDecoratedClass<Clazz,
        Method,
        Property,
        Parameter>('');

    private finalized: DecoratedClass[] = [];
    private finalizedCalled = false;
    private provider: string;

    constructor(provider: string) {
        this.provider = provider;
    }

    initProperty(name: string, isStatic: boolean, metadata: Property, decorator: string) {
        const target = isStatic ? this.cur.staticProperties : this.cur.properties;
        if (!target[name]) {
            target[name] = [];
        }

        target[name].push({...metadata, _type: RecordType.property, _provider: this.provider, _decorator: decorator});
    }

    pushProperty(proto: any, name: string, metadata: Property, decorator = '') {
        const isStatic = !!proto.prototype;
        this.checkProto(proto);
        this.initProperty(name, isStatic, metadata, decorator);
    }

    initMethod(name: string, isStatic: boolean) {
        const target = isStatic ? this.cur.staticMethods : this.cur.methods;
        if (!target[name]) {
            target[name] = {
                metadata: [],
                parameters: [],
            };
        }
    }

    pushMethod(proto: any, name: string, metadata: Method, decorator = '') {
        const isStatic = !!proto.prototype;
        this.checkProto(proto);
        this.initMethod(name, isStatic);
        const meta = {...metadata, _type: RecordType.method, _provider: this.provider, _decorator: decorator};
        if (isStatic) {
            this.cur.staticMethods[name].metadata.push(meta);
        } else {
            this.cur.methods[name].metadata.push(meta);
        }
    }

    initParameter(methodName: string, pos: number, isStatic: boolean) {
        this.initMethod(methodName, isStatic);
        if (!this.cur.methods[methodName].parameters[pos]) {
            this.cur.methods[methodName].parameters[pos] = [];
        }
    }

    pushParameter(
        proto: any,
        methodName: string,
        pos: number,
        metadata: Parameter,
        decorator = ''
    ) {
        const isStatic = !!proto.prototype;
        this.checkProto(proto);
        this.initParameter(methodName, pos, isStatic);
        this.cur.methods[methodName].parameters[pos].push({...metadata, _type: RecordType.parameter, _provider: this.provider, _decorator: decorator});
    }

    pushClass(clazz: any, metadata: Clazz, decorator = '') {
        this.checkProto(clazz);
        this.cur.clazz = clazz;
        this.cur.metadata.push({...metadata, _type: RecordType.clazz, _provider: this.provider, _decorator: decorator});
    }

    checkProto(proto: any) {
        const gid = getOrMakeGidForConstructor(proto);
        if (this.curGid != gid) {
            if (this.curGid) {
                this.finalized.push({...this.cur});
            }

            this.cur = getEmptyDecoratedClass<Clazz,
                Method,
                Property,
                Parameter>(gid);
            this.curGid = gid;
        }
    }

    getFinalized(): DecoratedClass<Clazz, Method, Parameter, Property>[] {
        if (!this.finalizedCalled) {
            this.finalizedCalled = true;
            if (this.curGid) {
                this.finalized.push({...this.cur});
                this.curGid = '';
            }
        }

        return [...this.finalized];
    }
}
