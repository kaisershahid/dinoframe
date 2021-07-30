"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const trueValues = [1, "1", "true", "y", "Y"];
exports.toBoolean = (val) => trueValues.includes(val);
exports.toInt = (val) => parseInt(val);
exports.toNumber = (val) => parseFloat(val);
exports.simpleCsvToList = (val) => val.split(",");
//# sourceMappingURL=utils.js.map