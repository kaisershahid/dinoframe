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
let lastGid = "";
let lastTarget;
let lastTargetClass;
let lastTargetWasClass = false;
exports.findGidForConstructor = (t) => {
    const isClass = typeof t == "function";
    let o = t;
    if (isClass) {
        o = t.prototype;
    }
    let gidT = '';
    let gidO = '';
    for (let i = 0; i < prototypeOrder.length; i++) {
        if (prototypeOrder[i] === o) {
            gidO = `${i + 1}`;
        }
        if (constructorRegistry[i] === t) {
            gidT = `${i + 1}`;
        }
    }
    // indicates class t is a subclass of gidO, so return ''
    if (!gidT && gidO) {
        return '';
    }
    else if (gidO) {
        return gidO;
    }
    return gidT;
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
    const isClass = typeof t == "function";
    let o = t;
    if (isClass) {
        o = t.prototype;
    }
    // console.log({
    //   isClass,
    //   lastGid,
    //   lastTargetWasClass,
    //   name: t.name,
    //   equals: lastTarget === o,
    //   equalsClass: lastTargetClass === t,
    //   t,
    //   o,
    //   lastTargetClass,
    //   lastTarget
    // })
    if (isClass) {
        const recastGid = lastGid;
        if (!lastTargetWasClass) {
            // previous calls were for method/property on the same prototype, so move to class
            if (lastTarget === o) {
                t.getDecoratorGid = () => {
                    return recastGid;
                };
                lastTargetWasClass = true;
                lastTargetClass = t;
                constructorRegistry[lastGid] = t;
                return lastGid;
            }
        }
        else if (lastTargetClass === t) {
            t.getDecoratorGid = () => {
                return recastGid;
            };
            return lastGid;
        }
    }
    else if (!lastTargetWasClass && o === lastTarget) {
        return lastGid;
    }
    let id = exports.findGidForConstructor(t);
    if (id) {
        return id;
    }
    id = `${gcounter++}`;
    lastGid = id;
    lastTarget = o;
    lastTargetClass = t;
    prototypeRegistry[id] = o;
    prototypeOrder.push(o);
    constructorRegistry[lastGid] = t;
    lastTargetWasClass = isClass;
    o.___gid = id;
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
exports.hasGidAccessor = (o) => typeof (o === null || o === void 0 ? void 0 : o.getDecoratorGid) === "function" || typeof (o === null || o === void 0 ? void 0 : o.___gid) === 'string';
/**
 * Gets the gid of what's assumed to be a class. If `getDecoratorGid()` exists, that value will be
 * returned, otherwise, the class will be
 */
exports.getGid = (o) => {
    var _a;
    const acc = exports.RegistryGidAccessor(o);
    return (_a = acc.___gid) !== null && _a !== void 0 ? _a : acc.getDecoratorGid();
};
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
    if (target.prototype) {
        target.prototype.___gid = gid;
    }
    else {
        target.___gid = gid;
    }
    return target;
};
//# sourceMappingURL=registry.js.map