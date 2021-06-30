# dinoframe

dinoframe is a collection of modules to make writing complex apps in Typescript easier through a powerful set of decorators:

- `decorator`: core utility functions/classes that let decorator libraries follow a standard pattern to collect and share decorator metadata consistently
- `service-container`: define services and dependencies, and let `ServiceContainer` take care of everything else
- `http`: define Express-friendly routes, middleware, and error handlers, and let `HttpDecoratorsBinder` take care of the rest 
- `morph`: define serializers and deserializers to make http <-> code <-> db data flow smooth

Decorator-based declaration frees you from:

1. boilerplate/glue code
2. rigid file structure (use what's right for you)

To get a sense
