# dinoframe

dinoframe is a decorator framework that makes wiring complex web apps in TypeScript easier. At its core, it provides libraries to make it easy to write and apply new decorators along wth a core set of decorators to make it easy to orchestrate application startup. In general, it should be pretty simple to integrate with and get moving.

## Quick note on `discover()`

The JS engine will only process a class when a concrete reference is made to it -- simply importing it won't do anything. To get around that, we've adopted the following convention: entrypoints into your code should contain `discover(): string`, either as a module member or static class member. This function should:

1. directly reference the classes you want to process
   - e.g. simply having a line like `[Class1, Class2]` is enough
2. optionally return a bundle identifier
   - explained in [bundle](./service-container/bundle/readme.md) submodule

This is only a suggestion, but we tend to prefer explicit entrypoints to avoid any confusion.

## `decorator`

TS doesn't make decorators instrinsic metadata on a class. If you like Java-style annotations that are accessible as class metadata, it's on you to implement that functionality yourself. However, even that has its limitations if you're interested in what other decorators are applied.

The `decorator` module changes that. It provides an easy way to:

1. collect decorator metadata into a convenient and hierarchical structure (grouping metadata by providers);
2. uniquely and consistently identify a class across arbitrary decorator providers;
3. package decorated classes into uniquely defined bundles (grouping metadata by concern);
4. introspect decorations from other providers using the collection library;

## `service-container`, `http`

Building on `decorator`, and inspired by [Apache Sling](https://sling.apache.org/), `service-container` makes it quick and simple to declare services and their
dependencies purely through decorators. Dependency management ensures no service starts up until all its dependencies are fulfilled, interfaces provide inversion-of-control, and flexible access pattern works seamlessly with your existing code.

A companion to the container is `http`, which makes it easy to declare routes and middleware in an Express-friendly way while also supporting service container integration.
