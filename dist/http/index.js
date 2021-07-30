"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const decorators_1 = require("../service-container/decorators");
const express_1 = __importDefault(require("express"));
const http = __importStar(require("http"));
const decorator_1 = require("../decorator");
exports.PROVIDER_ID = "dinoframe.http";
exports.HttpBundle = decorator_1.BundleDecoratorFactory(exports.PROVIDER_ID);
/**
 * Designated bundle entrypoint
 */
let ExpressApp = class ExpressApp {
    static getInstance() {
        return express_1.default();
    }
    static discover() {
        [HttpServer];
        return exports.PROVIDER_ID;
    }
};
__decorate([
    decorators_1.Factory
], ExpressApp, "getInstance", null);
ExpressApp = __decorate([
    exports.HttpBundle,
    decorators_1.Service("express.app")
], ExpressApp);
exports.ExpressApp = ExpressApp;
let HttpServer = class HttpServer {
    static getInstance(app) {
        return http.createServer(app);
    }
};
__decorate([
    decorators_1.Factory,
    __param(0, decorators_1.Inject({ id: "express.app" }))
], HttpServer, "getInstance", null);
HttpServer = __decorate([
    exports.HttpBundle,
    decorators_1.Service("http.server")
], HttpServer);
exports.HttpServer = HttpServer;
//# sourceMappingURL=index.js.map