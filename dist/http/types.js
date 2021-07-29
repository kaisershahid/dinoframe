"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestParamError = exports.HandlerConfigType = void 0;
var HandlerConfigType;
(function (HandlerConfigType) {
    HandlerConfigType[HandlerConfigType["route"] = 1] = "route";
    HandlerConfigType[HandlerConfigType["middleware"] = 2] = "middleware";
    HandlerConfigType[HandlerConfigType["error"] = 3] = "error";
})(HandlerConfigType = exports.HandlerConfigType || (exports.HandlerConfigType = {}));
class RequestParamError extends Error {
    constructor(message, params) {
        super(message);
        this.params = params;
    }
}
exports.RequestParamError = RequestParamError;
//# sourceMappingURL=types.js.map