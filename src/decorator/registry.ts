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
const prototypeRegistry: Record<string, any> = {};
const prototypeOrder: Function[] = [];
const constructorRegistry: Record<string, Function> = {};

let gcounter = 1;
let lastGid: string = "";
let lastTarget: any;
let lastTargetClass: any;
let lastTargetWasClass = false;

export const findGidForConstructor = (t: any): string => {
  const isClass = typeof t == "function";
  let o: any = t;
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
      gidT = `${i + 1}`
    }
  }

  // indicates class t is a subclass of gidO, so return ''
  if (!gidT && gidO) {
    return '';
  } else if (gidO) {
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
export const getOrMakeGidForConstructor = (t: any): string => {
  const isClass = typeof t == "function";
  let o: any = t;
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
    } else if (lastTargetClass === t) {
      t.getDecoratorGid = () => {
        return recastGid;
      };
      return lastGid;
    }
  } else if (!lastTargetWasClass && o === lastTarget) {
    return lastGid;
  }

  let id = findGidForConstructor(t);
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

export const getLastGid = (): string => lastGid;
export const isSameGid = (gid: string) => gid == lastGid;
export const wasLastClass = () => lastTargetWasClass;
export const getConstructorForGid = (gid: string): Function =>
  constructorRegistry[gid];

/**
 * If your class decorator extends base class, call this function to associate
 * the gid to the subclass (otherwise it'll always be associated with the base.)
 */
export const swapConstructorWithSubclass = (subclass: Function) => {
  if (lastGid) {
    lastTarget = subclass;
    prototypeOrder[prototypeOrder.length - 1] = subclass;
    prototypeRegistry[lastGid] = subclass;
  }
};

export type GidAccessible = {
  getDecoratorGid(): string;
  ___gid?: string;
};

export const hasGidAccessor = (o: any): o is GidAccessible =>
  typeof o?.getDecoratorGid === "function" || typeof o?.___gid === 'string';

/**
 * Gets the gid of what's assumed to be a class. If `getDecoratorGid()` exists, that value will be
 * returned, otherwise, the class will be
 */
export const getGid = (o: any) => {
  const acc = RegistryGidAccessor(o);
  return acc.___gid ?? acc.getDecoratorGid();
};

/**
 * Attaches `getDecoratorGid(): string` to target for convenient access to GID.
 * @todo guard against non-function?
 */
export const RegistryGidAccessor = <T extends { new(...args: any[]): {} }>(
  target: T
): T & GidAccessible => {
  if (hasGidAccessor(target)) {
    return target;
  }

  const gid = getOrMakeGidForConstructor(target);
  (target as any).getDecoratorGid = () => {
    return gid;
  };
  if ((target as any).prototype) {
    target.prototype.___gid = gid;
  } else {
    (target as any).___gid = gid;
  }


  return target as any;
};
