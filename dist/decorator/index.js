"use strict";
/**
 * A set of helper classes/methods that make it easy to process and collect decorator
 * metadata for reflection.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DecoratedClassBuilder = exports.duplicateDecoratorsForGid = exports.filterByDecorator = exports.filterMetadataByProvider = exports.flattenManyBundlesMetadata = exports.getManyBundlesMetadata = exports.getGidsForBundle = exports.getBundledMetadata = exports.getGlobalDecoratedClasses = exports.BundleDecoratorFactory = exports.getBundleId = exports.hasBundleId = exports.getEmptyDecoratedClass = exports.RecordType = void 0;
const registry_1 = require("./registry");
var RecordType;
(function (RecordType) {
    RecordType[RecordType["all"] = 1] = "all";
    RecordType[RecordType["clazz"] = 2] = "clazz";
    RecordType[RecordType["property"] = 3] = "property";
    RecordType[RecordType["method"] = 4] = "method";
    RecordType[RecordType["parameter"] = 5] = "parameter";
})(RecordType = exports.RecordType || (exports.RecordType = {}));
/**
 * Generates an empty structure with given gid.
 */
exports.getEmptyDecoratedClass = (gid, provider) => {
    return {
        _type: 0,
        _decorator: "@DecoratedClass",
        _provider: provider,
        gid,
        clazz: undefined,
        metadata: [],
        methods: {},
        staticMethods: {},
        properties: {},
        staticProperties: {},
    };
};
exports.hasBundleId = (o) => typeof (o === null || o === void 0 ? void 0 : o.getBundleId) === "function";
/**
 * Gets the gid of what's assumed to be a class. If `getDecoratorGid()` exists, that value will be
 * returned, otherwise, the class will be
 */
exports.getBundleId = (o) => exports.hasBundleId(o) ? o.getBundleId() : undefined;
let decClassInstances = [];
let lastBundleId = "";
/**
 * Returns a decorator that marks class as belonging to bundle identified by id. This allows you to
 * easily group and identify related classes in a module.
 *
 * ```
 * // e.g. setup base decorator for your bundle
 * const MyApp = BundleDecoratorFactory('myapp');
 *
 * @MyApp
 * class Service {}
 * ```
 *
 */
exports.BundleDecoratorFactory = (id) => {
    return (t) => {
        t.getBundleId = () => id;
        // notify each instance that @Bundle was found -- if the given target matches that
        // instance's current clazz, the instance will push the record to the bundle registry
        for (const dci of decClassInstances) {
            dci.bundleDeclared(id, t);
        }
    };
};
const globalRegistry = {};
const addToGlobalRegistry = (gid, metadata) => {
    if (!globalRegistry[gid]) {
        globalRegistry[gid] = [];
    }
    globalRegistry[gid].push(metadata);
};
exports.getGlobalDecoratedClasses = (filter) => {
    if (!filter) {
        filter = () => true;
    }
    const list = [];
    for (const gid of Object.keys(globalRegistry)) {
        list.push(...globalRegistry[gid]);
    }
    return list.filter(filter);
};
const bundleRegistry = {};
const bundleRegistryGid = {};
const addToBundleRegistry = (id, metadata) => {
    if (!bundleRegistry[id]) {
        bundleRegistry[id] = [];
        bundleRegistryGid[id] = [];
    }
    bundleRegistry[id].push(metadata);
    bundleRegistryGid[id].push(metadata.gid);
};
exports.getBundledMetadata = (id) => {
    if (!bundleRegistry[id]) {
        return { id, metadata: [] };
    }
    return { id, metadata: [...bundleRegistry[id]] };
};
exports.getGidsForBundle = (id) => {
    if (!bundleRegistryGid[id]) {
        return [];
    }
    return [...bundleRegistryGid[id]];
};
exports.getManyBundlesMetadata = (ids) => {
    return ids.map((id) => exports.getBundledMetadata(id));
};
/**
 * Most common use case -- get the metadata of all bundles as a single list.
 */
exports.flattenManyBundlesMetadata = (ids) => {
    return exports.getManyBundlesMetadata(ids)
        .map((m) => m.metadata)
        .reduce((a, b) => a.concat(b), []);
};
/**
 * Given an input list of metadata, only return the ones for specified provider. E.g.
 * `filterMetadataByProvider([{_provider:'http'},{_provider: 'service-container'}], 'http')`
 * returns `[{_provider:'http'}]`
 */
exports.filterMetadataByProvider = (metadata, provider) => {
    return metadata.filter((m) => m.provider == provider || m._provider == provider);
};
exports.filterByDecorator = (metadata, decorator) => {
    return metadata.filter((m) => m.decorator == decorator || m._decorator == decorator);
};
exports.duplicateDecoratorsForGid = (gid, newGid) => { };
/**
 * Iteratively construct a class tree of decorators for easy in-process and post-
 * process introspection. This is a concrete and easy-to-work-with alternative
 * to reflect-metadata with extra benefits (e.g. annotation libs can expose
 * their metadata via gid).
 *
 * This also populates the global registry as well as bundle registry, which you
 * can access from the above exposed methods.
 */
class DecoratedClassBuilder {
    constructor(provider) {
        this.curGid = "";
        this.cur = exports.getEmptyDecoratedClass("", "");
        this.finalized = [];
        this.map = {};
        this.changeTicks = 0;
        this.provider = provider;
        decClassInstances.push(this);
    }
    getChangeTicks() {
        return this.changeTicks;
    }
    checkProto(proto) {
        this.changeTicks++;
        const gid = registry_1.getOrMakeGidForConstructor(proto);
        if (this.curGid != gid) {
            this.cur = exports.getEmptyDecoratedClass(gid, this.provider);
            this.curGid = gid;
            // technically this should be done before next class starts getting processed,
            // but by doing this upfront (and using the reference to the current meta), we
            // can avoid boilerplate that needs to process the last seen class (since there's
            // no decorator-end event, we'd have to manually do this).
            this.finalized.push(this.cur);
            this.map[gid] = this.cur;
            addToGlobalRegistry(gid, this.cur);
        }
    }
    getByGid(gid) {
        return this.map[gid];
    }
    initProperty(name, isStatic, metadata, decorator) {
        const target = isStatic ? this.cur.staticProperties : this.cur.properties;
        if (!target[name]) {
            target[name] = [];
        }
        target[name].push({
            ...metadata,
            _type: RecordType.property,
            _provider: this.provider,
            _decorator: decorator,
        });
    }
    pushProperty(proto, name, metadata, decorator = "") {
        const isStatic = !!proto.prototype;
        this.checkProto(proto);
        this.initProperty(name, isStatic, metadata, decorator);
    }
    initMethod(name, isStatic) {
        const target = isStatic ? this.cur.staticMethods : this.cur.methods;
        if (!target[name]) {
            target[name] = {
                metadata: [],
                parameters: [],
            };
        }
    }
    pushMethod(proto, name, metadata, decorator = "") {
        const isStatic = !!proto.prototype;
        this.checkProto(proto);
        this.initMethod(name, isStatic);
        const meta = {
            ...metadata,
            _type: RecordType.method,
            _provider: this.provider,
            _decorator: decorator,
        };
        if (isStatic) {
            this.cur.staticMethods[name].metadata.push(meta);
        }
        else {
            this.cur.methods[name].metadata.push(meta);
        }
    }
    initParameter(methodName, pos, isStatic) {
        this.initMethod(methodName, isStatic);
        const target = isStatic ? this.cur.staticMethods : this.cur.methods;
        if (!target[methodName].parameters[pos]) {
            target[methodName].parameters[pos] = [];
        }
    }
    pushParameter(proto, methodName, pos, metadata, decorator = "") {
        const isStatic = !!proto.prototype;
        this.checkProto(proto);
        this.initParameter(methodName, pos, isStatic);
        const target = isStatic ? this.cur.staticMethods : this.cur.methods;
        target[methodName].parameters[pos].push({
            ...metadata,
            _type: RecordType.parameter,
            _provider: this.provider,
            _decorator: decorator,
        });
    }
    pushClass(clazz, metadata, decorator = "") {
        this.checkProto(clazz);
        this.cur.clazz = clazz;
        this.cur.metadata.push({
            ...metadata,
            _type: RecordType.clazz,
            _provider: this.provider,
            _decorator: decorator,
        });
    }
    getFinalized() {
        return [...this.finalized];
    }
    bundleDeclared(id, t) {
        if (this.cur.clazz === t) {
            addToBundleRegistry(id, this.cur);
        }
    }
}
exports.DecoratedClassBuilder = DecoratedClassBuilder;
//# sourceMappingURL=index.js.map