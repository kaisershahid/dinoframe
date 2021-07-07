# dinoframe

dinoframe is a decorator framework that makes wiring complex web apps in TypeScript easier. At its core, it provides libraries to make it easy to write and apply new decorators along wth a core set of decorators to make it easy to orchestrate application startup. In general, it should be pretty simple to integrate with and get moving.

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
