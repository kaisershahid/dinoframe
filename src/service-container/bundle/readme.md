# Bundles

Bundles are a mechanism for grouping service records into a logical unit. This helps to ensure 2 things:

1. not every registered service will be automatically started when including a module, leading to;
2. only enable the services for a specific runtime environment

## Assigning Bundle to Service

Bundles have an identifier. To attach this identifier decorate your class as follows:

```typescript
import { BundleDecoratorFactory } from "./index";
import { Service } from "./decorators";

// one-off
@BundleDecoratorFactory("my-id")
@Service("service1")
export class Service {}

// define canonical bundle that'll be re-used throughout module
export const MyBundle = BundleDecoratorFactory("my-id");

@MyBundle
@Service("service2")
export class Service2 {}
```

Services can belong to multiple bundles by applying multiple bundle decorators. This can be used for specifying alternate implementations (e.g. local/test vs staging/production).

### Retrieve metadata for a bundle

```typescript
import { getBundledMetadata } from "./index";

const services = getBundledMetadata("my-id");
```

## Bundle Configuration

By default, services are 1:1 with the classes that define them. We can get around this through a service factory, but that's not always the appropriate solution. Using a bundle configuration, services can now be mapped to new services from the original service id.

```javascript
const bundleConfig = {
  // define required bundles by id
  bundleDependencies: ["bundle-1"],
  // define required module entrypoint by id -- if `:` is included, right portion defines the exported class.
  // module/class is expected to have `discover(): string`. all extracted bundle ids are added to bundleDependencies
  moduleDependencies: ["module-1", "module-2:Class"],
  services: [
    {
      // original serviceId
      id: "service-id",
      // optional. if duplicating a service, the new serviceId
      runtimeId: "alt-service-id. specify this to duplicate/rename service-id",
      // optional. excludes service (shortcut for meta.isDisabled = true)
      disabled: true,
      // optional. overwrites corresponding @Service metadata
      meta: {
        priority: 100,
      },
      // generates a config meta-service. if original service is expecting a config, you must specify this
      config: {
        key: "config here generates service `config/<runtimeId or id>`",
      },
    },
    // another dupe
    {
      id: "service-id",
      runtimeId: "service-id-02",
    },
  ],
};
```

### `services`

Remember that services are instantiated from service records, which are simply just metadata for the container. The bundle config essentially copies the original metadata, overwrites the parts you specify, and adds it to the bundle's metadata set.

> Note: `services` is merged into existing bundle metadata set (i.e. you don't need to redeclare every service in your bundle).
