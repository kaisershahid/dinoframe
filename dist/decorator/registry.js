"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * The decorator registry provides a consistent way to get a unique identifier
 * for the class currently being processed. You  can also get the gid of any
 * class post-processing.
 *
 * The lookup is performed as follows:
 *
 * - if given object is a class, get its .prototype
 * - find or create gid for given prototype
 */
const prototypeRegistry = {};
const prototypeOrder = [];
const constructorRegistry = {};
let gcounter = 1;
let lastGid = '';
let lastTarget;
let lastTargetWasClass = false;
exports.findGidForConstructor = (t) => {
    const isClass = typeof t == 'function';
    let o = t;
    if (isClass) {
        o = t.prototype;
    }
    for (let i = 0; i < prototypeOrder.length; i++) {
        if (prototypeOrder[i] === o || prototypeOrder[i] === t) {
            return `${i + 1}`;
        }
    }
    return '';
};
/**
 * Lifecycle:
 *
 * - method/property/parameter: t is prototype; each prototype gets unique gid
 *   - wasLastClass() is false
 * - class: t is class; get prototype from t.prototype to resolve gid
 *   - wasLastClass() is true
 */
exports.getOrMakeGidForConstructor = (t) => {
    const isClass = typeof t == 'function';
    let o = t;
    if (isClass) {
        o = t.prototype;
    }
    // transition from property/method to class
    if (isClass && !lastTargetWasClass && lastTarget == o) {
        lastTargetWasClass = true;
        constructorRegistry[lastGid] = t;
        return lastGid;
    }
    if (o === lastTarget) {
        return lastGid;
    }
    let id = exports.findGidForConstructor(t);
    if (id) {
        return id;
    }
    id = `${gcounter++}`;
    lastGid = id;
    lastTarget = o;
    prototypeRegistry[id] = o;
    prototypeOrder.push(o);
    constructorRegistry[lastGid] = t;
    lastTargetWasClass = isClass;
    return id;
};
exports.getLastGid = () => lastGid;
exports.isSameGid = (gid) => gid == lastGid;
exports.wasLastClass = () => lastTargetWasClass;
exports.getConstructorForGid = (gid) => constructorRegistry[gid];
/**
 * If your class decorator extends base class, call this function to associate
 * the gid to the subclass (otherwise it'll always be associated with the base.)
 */
exports.swapConstructorWithSubclass = (subclass) => {
    if (lastGid) {
        lastTarget = subclass;
        prototypeOrder[prototypeOrder.length - 1] = subclass;
        prototypeRegistry[lastGid] = subclass;
    }
};
exports.hasGidAccessor = (o) => typeof (o === null || o === void 0 ? void 0 : o.getDecoratorGid) === 'function';
/**
 * Gets the gid of what's assumed to be a class. If `getDecoratorGid()` exists, that value will be
 * returned, otherwise, the class will be
 */
exports.getGid = (o) => exports.RegistryGidAccessor(o).getDecoratorGid();
/**
 * Attaches `getDecoratorGid(): string` to target for convenient access to GID.
 * @todo guard against non-function?
 */
exports.RegistryGidAccessor = (target) => {
    if (exports.hasGidAccessor(target)) {
        return target;
    }
    const gid = exports.getOrMakeGidForConstructor(target);
    target.getDecoratorGid = () => {
        return gid;
    };
    return target;
};
//# sourceMappingURL=registry.js.map