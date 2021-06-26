/**
 * The decorator registry provides a consistent way to get a unique identifier
 * for the class currently being processed.
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
 * Invoke this if decorator modifies class so that future references will target the right thing. Assumes serial processing
 * of decorators and classes.
 */
export const swapConstructorWithSubclass = (subclass: Function) => {
	if (lastGid) {
		lastTarget = subclass;
		prototypeOrder[prototypeOrder.length - 1] = subclass;
		prototypeRegistry[lastGid] = subclass;
	}
};
