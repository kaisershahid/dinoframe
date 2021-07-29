# Service Container

This module provides a set of decorators to:

1. easily declare services
2. easily declare dependencies (through method injection)
3. intelligently manage activation/deactivation (eliminating )
4. package related services through bundles
5. emit/listen to container events

> See `../__fixtures/example-app/` for a quick, real-world intro to setting up an web server.

It is heavily inspired by my experiences using [Apache Sling](https://sling.apache.org/), a fantastic RESTful framework for Java.

## Declaring Services and Dependencies with `@Service` and `@Inject`

Services can be declared with **`@Service(id: string, opts?)`**. `opts` can have the following values:

- **priority**: determines start order (desc priority)
- **disabled**: if `true`, service is ignored
- **injectConfig**: if `true` or a serviceId, injects the config service as the first and only constructor argument
  - if `true`, the expected config service would be `config/${serviceId}`, otherwise, it's whatever string value is defined
  - (yes, configurations are managed as services. that means you get a lot of control in how configs are managed, boilerplate-y as it may sound)
- **interfaces**: a list of strings indicating the interfaces this service conforms to and can be referenced as
- **isFactory**: if `true`, service acts as a proxy to sub-services identified through `subId@serviceId`. Will be discussed further later

```typescript
@Service("controller", {
  priority: 100,
  injectConfig: true,
})
export class HttpController {}
```

### Interfaces

Interfaces in the container are simply string identifiers, and the container itself does no verification of exposed methods. That aside, they have the same semantic meaning as any other interface:

> Any services declaring some interface X are expected to provide all the associated behavior associated with X

This allows the container to provide inversion-of-control.

### Dependency Injection

Dependencies are defined through method injection using `@Inject({id?: string, matchInterface?: string, matchCriteria?: {min: number}})`.

The behavior of injection is determined as follows:

- if `id` is set, expects exactly one service identified by the id
- if `matchInterface` is set, expects by default at least 1 service providing the interface. The minimum number of services required can be set through `matchCriteria` (e.g. if 6 services are needed, use `matchCritiera:{min:6}`)

```typescript
@Service("controller")
export class HttpController {
  // direct reference
  setDb(@Inject({ id: "db" }) db) {
    this.db = db;
  }

  // indirect reference. using min=0 so that controller will always start
  // if no routers are available
  setRouters(
    @Inject({ matchInterface: "http.router", matchCriteria: { min: 0 } })
    routers
  ) {
    this.routers = routers;
  }
}
```

### Dependency Injection at Instantiation

TS disallows decorators on the constructor function itself. To do this, you'll need to declare a static method with injection that returns an actual instance:

```typescript
@Service("controller")
export class HttpController {
  constructor(s1) {
    this.s1 = s1;
  }

  @Factory
  static getInstance(@Inject({}) s1) {
    return new HttpController(s1);
  }
}
```

### Activation and Deactivation

Services can decorate an instance method with `@Activate` and `@Deactivate`. If `@Activate` is declared, the method must successfully execute before the service is available. `@Deactivate` is treated as best-effort: errors will be logged but will not block further deactivation.

Both methods can be asynchronous.

## Service lifecycle management

The full power of the service container lies in putting service, injection, and activation/deactivation declarations together to completely take over application initialization. This saves a tremendous amount of effort in writing/managing the boilerplate associated with adding new services to your app.

As the developer, you can provide an optional starting priority, otherwise, the container take cares of everything else:

- waiting on dependencies via id or interface;
- creating instance;
- injecting dependencies;
- activating;
- advertising availability;

Compare to awilix, which requires following correct startup order and manual/direct interaction with the container to initialize.

Consider the following services (in priority order):

- A depends on [B, C]
- B has no dependencies
- C depends on D
- D has no dependencies

If we step through startup, we get the following:

1. A waiting on [B, C]
2. B available
3. C waiting on [D]
4. D available
5. C available
6. A available

Now imagine that for a more complex, real-world app and rest easy that you don't need to deal with those steps.

The next two sections break down the activation process more completely.

### Satisfied/No dependencies

- if service.dependencies are satisfied, continue with startup
- create instance
- inject service.dependencies
- if activation handler defined, invoke
- advertise availability (and notify dependents)

### 1+ dependencies not satisfied

- if 1+ of service.dependencies not available
  - mark waiting on each service.dependencies not available
- when newService available
  - if newService fulfills a dependency, remove newService from waiting
- if service dependencies are all available
  - create instance
  - inject service.dependencies
  - if activation handler defined, invoke
  - advertise availability (and notify dependents)

## Service Factories

Think for a moment about a fancy logger service (e.g. SLF4J if you've been in the Java world): if you want a logger for `x.y.Z`, the logger factory gives you a logger instance. In the background, the factory will map `x.y.Z` to one of many rules that determines which logger is returned. The returned logger may write to an alternate log file and have different formatting, but you as the developer don't need to deal with that.

In the context of the service container, this could be accomplished by always asking for a reference to a logger factory service and asking the factory to give you a logger instance. Easy but a little boilerplate-y. What if you could short-circuit that pattern?

That's where the service factory comes in. A factory is determined by setting `isFactory: true`, and the factory is expected to have the following methods:

- `resolve<T>(id: string)`
- `has(id: string)`

Looks like a partial definition for the container -- and it is. The service factory essentially acts as a barebones proxy container.

Now, going back to our original example, how can we leverage getting what's essentially a sub-service while maintaining the same access patterns? Simple: create sub-service references in the form **`subId@serviceId`** (e.g. `x.y.Z@logger.factory`). When the main container receives `subId@serviceId`, it does the following:

1. checks that `serviceId` exists and is a factory
2. invokes `factory.resolve('subId')`

That's it! Use your imagination to see how you can exploit this.

### Dependency Resolution/Activation

Because of the unknown cardinality and dynamic nature of sub-services, a direct dependency on `subId@serviceId` is translated into `serviceId` -- once `serviceId` is available, the container will do an injection-time resolve on `subId`. If the factory does not support `subId`, an exception will be thrown and service will fail to become available.

## Bundles

Services can be logically grouped together by associating it with a bundle. This makes it easy to share your services with others, isolate test services, and allow development of services for different environments.

> A bundle decorator is returned from `BundleDecoratorFactory`, and service metadata can be retrieved using `getBundleMetadata(bundleId: string)`.

[See bundle/readme.md](./bundle/readme.md) for more in-depth discussion of bundles.

## A Complete Picture

The following example shows how to define services, associate them with a bundle, and selectively register and start those bundles in the container.

```typescript
import {
  Service,
  Activate,
  Deactivate,
  Inject,
  Factory,
  ServiceFactory,
} from "./decorators";
import {
  BundleDecoratorFactory,
  getBundledMetadata,
  ServiceContainer,
} from "./index";

const ExampleBundle = BundleDecoratorFactory("example");

@ExampleBundle
@Service("exampleService", {
  // optional; interfaces exposed by service (1:many) -- provides simple IoC.
  interfaces: ["codec.mp4", "codec.mpg"],
  // optional; if true, ignored by service container and will block dependents
  disabled: false,
})
class ExampleService {
  // if constructor needs injection, you must use @Factory on
  // static method due to restrictions on decorating constructor
  constructor(depSvc: any) {
    this.depSvc = depSvc;
  }

  @Factory()
  static makeInstance(@Inject("depId") depSvc: any) {
    return new ExampleService(depSvc);
  }

  // sets the service identified by 'anotherDepId' once that service
  // has completed its activation
  setAnotherDepSvc(@Inject({ id: "anotherDepId" }) svc: any) {
    this.anotherDepSvc = svc;
  }

  // activation is optional. only one activator is allowed; others ignored
  @Activate
  activate() {
    // do any necessary activation logic. no error signals success.
    // can return Promise (dependencies will not be activated until
    // this completes)
  }

  // deactivation is optional. only one deactivator is allowed; others ignored
  @Deactivate()
  deactivate() {
    // shutdown logic. error generates warning but does not stop
    // dependent shutdown. can return Promise (blocks dependent until
    // this completes)
  }

  codecMp4(url: string, stream: any) {
    // fetch url and encode to stream
  }

  codecMpg(url: string, stream: any) {
    // fetch url and encode to stream
  }
}

export class Logger {}

@ExampleBundle
@Service("logger.factory", {
  isFactory: true,
})
class ExampleLoggerFactory {
  private cache: Record<string, any> = {};

  resolve(id: string) {
    if (!this.cache[id]) {
      this.cache[id] = new Logger();
    }

    return this.cache[id];
  }

  has(id: string) {
    return true;
  }
}

// the convenience function flattenManyBundlesMetadata() expects a list of bundle ids and returns all the services associated with them
const container = new ServiceContainer(flattenManyBundlesMetadata(["example"]));
container.startup().then(() => {
  console.log("container started up!");
});
```

## Todos

- [ ] define `@Subscribe` (method) -- receives notification for container events (e.g. specific service started, service advertising an interface started/deactivating, etc)
