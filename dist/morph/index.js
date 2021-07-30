"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("./types");
const registry_1 = require("../decorator/registry");
exports.NAME_CATCH_ALL = "*";
class MorphMarshaller {
    constructor(decoratedMeta, manager) {
        var _a, _b;
        this.propertyDefs = {};
        this.discriminatorCol = "";
        this.subclasses = {};
        this.ignoreProps = [];
        this.manager = manager;
        this.originalMeta = decoratedMeta;
        this.clazz = decoratedMeta.clazz;
        const morphMeta = decoratedMeta.metadata[0];
        this.ignoreProps = (_a = morphMeta.ignoreProps) !== null && _a !== void 0 ? _a : [];
        // a base class without discriminatorValue means we apply parent's decorators too
        if (((_b = morphMeta.inherits) === null || _b === void 0 ? void 0 : _b.baseClass) &&
            !morphMeta.inherits.discriminatorValue) {
            this.baseClass = morphMeta.inherits.baseClass;
        }
        if (this.clazz.___discriminatorMap) {
            this.discriminatorCol = this.clazz.___discriminatorCol;
            this.subclasses = { ...this.clazz.___discriminatorMap };
        }
        this.init();
    }
    getGid() {
        return this.originalMeta.gid;
    }
    init() {
        this.initProperties();
        this.initMethods();
    }
    canHandle(clazz) {
        return this.clazz === clazz;
    }
    initProperties() {
        for (const propertyName in this.originalMeta.properties) {
            const { name, ...rest } = this.originalMeta.properties[propertyName][0];
            this.updateProperty(name, rest);
        }
    }
    initMethods() {
        for (const method of Object.values(this.originalMeta.methods)) {
            const def = method.metadata[0];
            if (def.finalize) {
                this.finalizeMethod = def.finalize;
            }
            else if (def.serialize) {
                this.serializeMethod = def.serialize;
            }
            else if (def.deserialize) {
                this.deserializeMethod = def.deserialize;
            }
            else {
                this.updateProperty(def.name, def);
            }
        }
    }
    updateProperty(name, def) {
        if (!this.propertyDefs[name]) {
            this.propertyDefs[name] = { name };
        }
        this.propertyDefs[name] = { ...this.propertyDefs[name], ...def };
    }
    /**
     * Returns either an instance of the current class or, if polymorphism is
     * detected, attempts to return a subclass instance.
     * @return The effective instance along with its subclass constructor (optional)
     */
    makeInstance(source) {
        if (this.discriminatorCol) {
            try {
                const dvalue = source[this.discriminatorCol];
                const subclass = this.subclasses[dvalue];
                return [new subclass(), subclass];
            }
            catch (err) {
                throw new types_1.MorphError(`${this.clazz.name}: could not map ${this.clazz.___discriminatorCol}=${source[this.clazz.___discriminatorCol]} to a subclass: ${err.message}`);
            }
        }
        else {
            return [new this.clazz(), null];
        }
    }
    doSetValue(inst, val, def, errors) {
        const name = def.name;
        // assumes name key not present, so skip (but check required first)
        if (val === undefined || val === null) {
            if (def.required) {
                errors[name] = { message: "required" };
            }
            return;
        }
        if (typeof def.type == "function") {
            if (val instanceof Array) {
                val = val.map((v) => this.deserializeNested(v, def.type));
            }
            else {
                val = this.deserializeNested(val, def.type);
            }
        }
        else {
            try {
                ValueFactory.validateValue(val, def);
            }
            catch (e) {
                errors[name] = e;
            }
        }
        if (def.setter) {
            try {
                inst[def.setter](val);
            }
            catch (err) {
                errors[name] = { message: err.message, exception: err };
                return;
            }
        }
        else if (def.propertyName) {
            if (def.validator) {
                const valError = def.validator(val, name);
                if (valError) {
                    errors[name] = valError;
                    return;
                }
            }
            else if (def.required) {
                if (val === "" || val === null) {
                    errors[name] = { message: "required" };
                    return;
                }
            }
            inst[def.propertyName] = val;
        }
    }
    doDeserialize(inst, source) {
        const errors = {};
        let catchAllDef = null;
        const keysProcessed = {};
        for (const name in this.propertyDefs) {
            const def = this.propertyDefs[name];
            if (name == exports.NAME_CATCH_ALL) {
                catchAllDef = def;
                continue;
            }
            let val = source[name];
            keysProcessed[name] = name;
            this.doSetValue(inst, val, def, errors);
        }
        if (catchAllDef) {
            let subset = {};
            for (const key in source) {
                if (!keysProcessed[key]) {
                    subset[key] = source[key];
                }
            }
            this.doSetValue(inst, subset, catchAllDef, errors);
        }
        if (Object.keys(errors).length > 0) {
            throw new types_1.ObjectError(this.clazz.name, errors);
        }
        if (this.finalizeMethod) {
            inst[this.finalizeMethod]();
        }
        return inst;
    }
    getAncestorStack() {
        const mstack = [this];
        let t = this.manager.getByClassOrId(this.baseClass);
        while (t) {
            mstack.unshift(t);
            t = this.manager.getByClassOrId(t.baseClass);
        }
        return mstack;
    }
    /**
     * Build morpher stack and apply from highest to lowest
     */
    deserializeAncestors(inst, source) {
        const mstack = this.getAncestorStack();
        for (const tr of mstack) {
            tr.doDeserialize(inst, source);
        }
    }
    deserialize(source) {
        const [inst, subclass] = this.makeInstance(source);
        if (this.deserializeMethod) {
            inst[this.deserializeMethod](source, this.manager);
            return inst;
        }
        if (this.baseClass) {
            this.deserializeAncestors(inst, source);
        }
        else {
            this.doDeserialize(inst, source);
        }
        if (subclass) {
            // continue populating using subclass rules
            const subtransformer = this.manager.getByClassOrId(subclass);
            subtransformer === null || subtransformer === void 0 ? void 0 : subtransformer.doDeserialize(inst, source);
        }
        return inst;
    }
    doSerialize(map, source) {
        let catchAllDef = null;
        for (const name in this.propertyDefs) {
            if (name == exports.NAME_CATCH_ALL) {
                catchAllDef = this.propertyDefs[name];
                continue;
            }
            const def = this.propertyDefs[name];
            let val;
            if (def.getter) {
                val = source[def.getter]();
            }
            else if (def.propertyName) {
                val = source[def.propertyName];
            }
            if (typeof def.type == "function") {
                if (val instanceof Array) {
                    val = val.map((v) => this.serializeNested(v, def.type));
                }
                else {
                    val = this.serializeNested(val, def.type);
                }
            }
            map[name] = val;
        }
        if (catchAllDef) {
            let subset = {};
            if (catchAllDef.getter) {
                subset = source[catchAllDef.getter];
            }
            else if (catchAllDef.propertyName) {
                subset = source[catchAllDef.propertyName];
            }
            for (const key in subset) {
                map[key] = subset[key];
            }
        }
        for (const ignoreProp of this.ignoreProps) {
            delete map[ignoreProp];
        }
    }
    serializeAncestors(map, source) {
        const mstack = this.getAncestorStack();
        for (const t of mstack) {
            t.doSerialize(map, source);
        }
    }
    serialize(source) {
        const map = {};
        if (this.serializeMethod) {
            return source[this.serializeMethod](this.manager);
        }
        if (this.baseClass) {
            this.serializeAncestors(map, source);
        }
        else {
            this.doSerialize(map, source);
        }
        if (this.discriminatorCol) {
            // serialize and copy non-undefined values into map if polymorph
            const subclass = this.subclasses[map[this.discriminatorCol]];
            if (subclass) {
                const subclassSer = this.serializeNested(source, subclass);
                for (const _key in subclassSer) {
                    const subVal = subclassSer[_key];
                    // case: PropertySet defined on subclass but not PropertyGet
                    if (subVal !== undefined) {
                        map[_key] = subVal;
                    }
                }
            }
            // @todo else exception?
        }
        return map;
    }
    deserializeNested(val, clazz) {
        const transformer = this.manager.getByClassOrId(clazz);
        if (transformer) {
            return transformer.deserialize(val);
        }
        else {
            // @todo pojoTransformer?
            return val;
        }
    }
    serializeNested(val, clazz) {
        const transformer = this.manager.getByClassOrId(clazz);
        if (transformer) {
            return transformer.serialize(val);
        }
        else {
            // @todo pojoSerialize?
            return null;
        }
    }
}
exports.MorphMarshaller = MorphMarshaller;
class ValueFactory {
    static validateValue(val, def) {
        if (def.listType == "strict" && !(val instanceof Array)) {
            throw new types_1.FieldError(`listType=strict, ${typeof val} given`);
        }
        if (val instanceof Array) {
            if (!def.listType) {
                throw new types_1.FieldError(`listType=none, array given`);
            }
            let errors = {};
            let err = 0;
            for (let i = 0; i < val.length; i++) {
                try {
                    this.assertProperType(val[i], def);
                }
                catch (e) {
                    errors[i] = e.message;
                    err++;
                }
            }
            if (err) {
                throw new types_1.FieldError(`one or more errors: ${JSON.stringify(errors)}`);
            }
        }
        else {
            this.assertProperType(val, def);
        }
    }
    static assertProperType(val, def) {
        var _a, _b;
        switch (def.type) {
            case "boolean":
                if (typeof val != "boolean") {
                    throw new types_1.FieldError(`not a boolean: ${JSON.stringify(val)}`);
                }
                break;
            case "string":
                if (typeof val != "string") {
                    throw new types_1.FieldError(`not a string: ${JSON.stringify(val)}`);
                }
                break;
            case "number":
                if (typeof val != "number") {
                    throw new types_1.FieldError(`not a number: ${JSON.stringify(val)}`);
                }
                break;
            case "enum":
                if (!((_a = def.enumValues) === null || _a === void 0 ? void 0 : _a.includes(val))) {
                    throw new types_1.FieldError(`${val} does not match any enum values: [${(_b = def.enumValues) === null || _b === void 0 ? void 0 : _b.join("; ")}]`);
                }
                break;
        }
    }
}
exports.ValueFactory = ValueFactory;
class BasicMorpherManager {
    constructor(morphMeta = []) {
        this.morphers = {};
        for (const m of morphMeta) {
            this.morphers[m.gid] = new MorphMarshaller(m, this);
        }
    }
    getByClassOrId(clazzOrId) {
        if (!clazzOrId) {
            return;
        }
        const gid = typeof clazzOrId == "string" ? clazzOrId : registry_1.getGid(clazzOrId);
        return this.morphers[gid];
    }
    deserializeTo(source, clazz) {
        const m = this.getByClassOrId(clazz);
        if (!m) {
            throw new types_1.MorphError(`deserialize: no morpher for ${clazz.name}`);
        }
        return m.deserialize(source);
    }
    serializeFrom(source) {
        const m = this.getByClassOrId(Object.getPrototypeOf(source));
        if (!m) {
            throw new types_1.MorphError(`serialize: no morpher for ${source}`);
        }
        return m.serialize(source);
    }
}
exports.BasicMorpherManager = BasicMorpherManager;
//# sourceMappingURL=index.js.map