# Decorators

Because decorators aren't an intrinsic part of a class, it's impossible to know what decorators are available for a class without doing two things:

- consistently identifying the class across all the modules whose decorators are applied to it (e.g. `http` and `service-container` by design know nothing about each other);
- exposing a way to consistently reference other modules' decorators, either in a global registry or a more specific access point (e.g. `http.getAllDecorators()`)

The `decorator` module has various utilities to accomplish exactly those things.

## Registry

The registry maps a unique id to each class processed. This allows various decorator libraries to cross-reference each other (e.g. the `http` module may want to see what `service-container` annotations exist on a `@Route` so that it can inject services into the right argument position).

It also auto-injects `static getDecoratorGid()` into classes for convenient identity access.

## `DecoratedClass`

The `DecoratedClass` encapsulates all class decorators in a logical way:

- `metadata[]`: the class-level decorators
- `methods`: a map of method decorators, keyed by method name
  - `metadata[]`: the method-level decorators
  - `parameters[][]`: a list of parameter argument decorators
    - `parameter[]`: the argument-level decorators
- `accessors`: TODO a map of accessor decorators
- `properties`: a map of property decorators

This class is built up with a simple access pattern using `DecoratedClassBuilder` (see `http/decorators.ts` for example usage). The _decorators_ referenced are types you define and generate for class, method, parameter, property, and accessor.)

## Bundles

In order to provide better isolation and flexibility, classes can be grouped together in a **bundle**. You can then retrieve the annotations for just that bundle. Here's how:

```typescript
import {DecoratedClassBuilder, getBundledMetadata} from "./index";
import {BundleDecoratorFactory} from "./bundle";

const builder = new DecoratedClassBuilder();
// first, we'll create our decorator function using BundleDecoratorFactory
const MyBundle = BundleDecoratorFactory('my', builder);

// next, apply the decorator to your classes
@MyBundle
class Service1 {
}

@MyBundle
class Service2 {
}

// finally, see the records for your classes
console.log(getBundledMetadata('my'))
```

With bundles, it's easy to only enable the ones you want for your application.

---

## How TS Processes Decorators

This is mainly a quick reference, but if you know next to nothing about TS decorators, this should save you some time/grief.

If you're familiar with Java annotations, throw that out the window. Decorators don't magically become metadata on the class -- decorators are callback functions that get called once the class is loaded (but before any other part of your code executes). 

### Quick step-by-step

Let's take this example class (ignore the absence/presence of `()` for now):

```typescript
@Class()
class MyClass {
    @Property
    private _x = true;
    
    @Method
    method(@Arg arg1) {
    }
    
    @Accessor()
    get x() {
        return this._x;
    }

    @Property
    private _y = false;
}
```

Once the class is loaded, TS will process the decorators in this order (top-to-bottom, inside out):

- `@Property`
- `@Arg`
- `@Method`
- `@Accessor`
- `@Property`
- `@Class`
