"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const decorator_1 = require("../decorator");
exports.MORPH_PROVIDER = 'dinoframe.morph';
class MorphError extends Error {
    constructor(message) {
        super(message);
    }
}
exports.MorphError = MorphError;
class FieldError extends MorphError {
    constructor(message) {
        super(message);
    }
}
exports.FieldError = FieldError;
class ObjectError extends MorphError {
    constructor(targetName, errors) {
        super(`One or more errors for: ${targetName}`);
        this.fieldErrors = errors;
    }
}
exports.ObjectError = ObjectError;
exports.getMorphDecoratorBuilder = () => {
    return new decorator_1.DecoratedClassBuilder(exports.MORPH_PROVIDER);
};
//# sourceMappingURL=types.js.map