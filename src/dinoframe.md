# dinoframe

dinoframe is a collection of modules to make writing complex web apps in Typescript easier through a powerful set of decorators:

- `decorator`: core utility functions/classes that let decorator libraries follow a standard pattern to collect and share decorator metadata consistently. Used by all the other modules
- `service-container`: define services and their dependencies directly on classes, and use the service container to orchestrate their lifecycle. Also includes dynamic configuration management (through, you guessed it, declared services)
- `http`: define Express-friendly routes, middleware, and error handlers directly on classes. Works seamlessly with `service-container`
- `morph`: define serializers and deserializers to make `http <-> code <-> db` data flow smooth

Decorator-based declaration frees you from:

1. repetitive/multiline boilerplate code
2. rigid file structure (use what's right for you)
