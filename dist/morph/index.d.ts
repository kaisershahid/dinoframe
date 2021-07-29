import { DecoratedMorphClass, Morpher, MorpherManager, TransformerPropertyDef } from "./types";
export declare const NAME_CATCH_ALL = "*";
export declare class MorphMarshaller<Manager extends MorpherManager<any> = any> implements Morpher {
    private manager;
    private clazz;
    private baseClass;
    private originalMeta;
    propertyDefs: Record<string, TransformerPropertyDef>;
    discriminatorCol: string;
    subclasses: Record<string, typeof Function>;
    ignoreProps: string[];
    finalizeMethod?: string;
    serializeMethod?: string;
    deserializeMethod?: string;
    constructor(decoratedMeta: DecoratedMorphClass, manager: Manager);
    getGid(): string;
    private init;
    canHandle(clazz: any): boolean;
    private initProperties;
    private initMethods;
    private updateProperty;
    /**
     * Returns either an instance of the current class or, if polymorphism is
     * detected, attempts to return a subclass instance.
     * @return The effective instance along with its subclass constructor (optional)
     */
    makeInstance(source: any): any;
    doSetValue(inst: any, val: any, def: TransformerPropertyDef, errors: Record<string, any>): void;
    doDeserialize<T extends any = any>(inst: any, source: any): T;
    getAncestorStack(): MorphMarshaller<Manager>[];
    /**
     * Build morpher stack and apply from highest to lowest
     */
    deserializeAncestors(inst: any, source: any): void;
    deserialize<T extends any = any>(source: any): T;
    doSerialize(map: any, source: any): void;
    serializeAncestors(map: any, source: any): void;
    serialize(source: any): any;
    private deserializeNested;
    private serializeNested;
}
export declare class ValueFactory {
    static validateValue(val: any, def: TransformerPropertyDef): void;
    static assertProperType(val: any, def: TransformerPropertyDef): void;
}
export declare class BasicMorpherManager implements MorpherManager<MorphMarshaller> {
    private morphers;
    constructor(morphMeta?: DecoratedMorphClass[]);
    getByClassOrId(clazzOrId: any): MorphMarshaller<BasicMorpherManager> | undefined;
    deserializeTo<T extends any = any>(source: any, clazz: any): T;
    serializeFrom<T extends any = any>(source: any): Record<string, any>;
}
