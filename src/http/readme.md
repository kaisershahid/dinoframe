## `@Controller`

TODO 

## `@Route`

TODO

## `@Middleware`

TODO

## `@ErrorMiddleware`

TODO

## `@RequestParam`

TODO reformat based on a better layout from above sections

Accepts:

| Name             | Type                                                                | Description                                                                                                             |
| ---------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **name**         | `string`                                                            | name of parameter to inject. Can be from body, if structured, or query parameter                                        |
| **required**?    | `boolean`                                                           | If true, expects `name` is present anod not null/undefined/empty string. Throws `InjectableParamError`                  |
| **enumValue**?   | `any[]`                                                             | If set, parameter value must match one of these                                                                         |
| **validator**?   | `(value:any, context: InjectableParamContext): string undefined`  | If set, passes extracted value. Return is either undefined on success or message on error. Takes precedence over `enum` |
| **transformer**? | `(value:any, context: InjectableParamContext): any`                 | If set, passes extracted value and returns a transformed value. Called before `validator`                               |
