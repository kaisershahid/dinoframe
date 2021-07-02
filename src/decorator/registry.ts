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
let lastTargetWasClass = false;

export const findGidForConstructor = (t: any): string => {
  const isClass = typeof t == "function";
  let o: any = t;
  if (isClass) {
    o = t.prototype;
  }

  for (let i = 0; i < prototypeOrder.length; i++) {
    if (prototypeOrder[i] === o || prototypeOrder[i] === t) {
      return `${i + 1}`;
    }
  }

  return "";
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

  // transition from property/method to class
  if (isClass && !lastTargetWasClass && lastTarget == o) {
    lastTargetWasClass = true;
    constructorRegistry[lastGid] = t;
    return lastGid;
  }

  if (o === lastTarget) {
    return lastGid;
  }

  let id = findGidForConstructor(t);
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
};

export const hasGidAccessor = (o: any): o is GidAccessible =>
  typeof o?.getDecoratorGid === "function";

/**
 * Gets the gid of what's assumed to be a class. If `getDecoratorGid()` exists, that value will be
 * returned, otherwise, the class will be
 */
export const getGid = (o: any) => RegistryGidAccessor(o).getDecoratorGid();

/**
 * Attaches `getDecoratorGid(): string` to target for convenient access to GID.
 * @todo guard against non-function?
 */
export const RegistryGidAccessor = <T extends { new (...args: any[]): {} }>(
  target: T
): T & GidAccessible => {
  if (hasGidAccessor(target)) {
    return target;
  }

  const gid = getOrMakeGidForConstructor(target);
  (target as any).getDecoratorGid = () => {
    return gid;
  };

  return target as any;
};
