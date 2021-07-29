"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simpleCsvToList = exports.toNumber = exports.toInt = exports.toBoolean = void 0;
const trueValues = [1, "1", "true", "y", "Y"];
exports.toBoolean = (val) => trueValues.includes(val);
exports.toInt = (val) => parseInt(val);
exports.toNumber = (val) => parseFloat(val);
exports.simpleCsvToList = (val) => val.split(",");
//# sourceMappingURL=utils.js.map