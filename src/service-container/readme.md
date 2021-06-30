# Service Container

This module provides a powerful, declarative way to create and manage services and frees you from all but the most minimal glue code (usually, a one-liner into the root service/module you want to register). See `index.test.ts` for how easy it is to start up the service container with example classes.

```typescript
import {Service, Activate, Deactivate, Inject, Factory, ServiceFactory} from "./decorators";

@Service('exampleService', {
    // optional; interfaces exposed by service (1:many) -- provides simple IoC.
    interfaces: [
        'codec.mp4',
        'codec.mpg'
    ],
    // optional; if true, ignored by service container and will block dependents
    disabled: false,
})
class ExampleService {
    // if constructor needs injection, you must use @Factory on 
    // static method due to restrictions on decorating constructor
    @Factory()
    constructor(depSvc: any) {
        this.depSvc = depSvc;
    }

    @ServiceFactory()
    static makeInstance(@Inject('depId') depSvc: any) {
        return new ExampleService(depSvc);
    }

    // sets the service identified by 'anotherDepId' once that service
    // has completed its activation
    @Inject('anotherDepId')
    setAnotherDepSvc(svc: any) {
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

// get/create an instance using `id@factory.id` -- if container sees `@`, it assumes 
// everything to the right references a service factory, and will pass `id` to the
// getter. this essentially treats the factory as a specialized container. use this
// to manage things like logger instances.
@ServiceFactory("factory.id", {
    interfaces: ['logger.logger']
})
class ExampleServiceFactory {
    private cache: Record<string, any> = {};
    get(id: string) {
        if (!this.cache[id]) {
            this.cache[id] = new Instance();
        }
        
        return this.cache[id]
    }
}
```

---
## Todos

- [ ] define general flow of service management/injection
- [x] define `ServiceContainer`
- [x] define `@Service` (class), `@Activate` (method), `@Deactivate` (method), `@Factory` (method)
- [ ] define `@Dependency` (class)
- [x] define `@Inject` (method)
- [ ] define `@ServiceFactory` (class)
- [ ] define `@Config` (class)
- [ ] define `@Subscribe` (method) -- receives notification for container events (e.g. specific service started, service advertising an interface started/deactivating, etc)
