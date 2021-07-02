/// <reference types="node" />
import * as http from "http";
export declare const PROVIDER_ID = "dinoframe.http";
export declare const HttpBundle: (t: any) => void;
/**
 * Designated bundle entrypoint
 */
export declare class ExpressApp {
    static getInstance(): import("express-serve-static-core").Express;
    static discover(): string;
}
export declare class HttpServer {
    static getInstance(app: any): http.Server;
}
