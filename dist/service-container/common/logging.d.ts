import { FactoryContainer } from "../types";
export declare const ID_LOGGER = "logger";
export declare enum LoggerLevel {
    TRACE = 1,
    DEBUG = 2,
    INFO = 3,
    WARN = 4,
    ERROR = 5
}
export declare const INTERFACE_LOG_LOGGER = "logger.logger";
export interface Logger {
    trace(messageOrError: string | Error | any, err?: Error | any, ...args: any[]): any;
    debug(messageOrError: string | Error | any, err?: Error | any, ...args: any[]): any;
    info(messageOrError: string | Error | any, err?: Error | any, ...args: any[]): any;
    warn(messageOrError: string | Error | any, err?: Error | any, ...args: any[]): any;
    error(messageOrError: string | Error | any, err?: Error | any, ...args: any[]): any;
}
export declare class LoggerWrappingWriter implements Logger {
    private name;
    private writer;
    constructor(name: string, writer: LoggerWriter);
    debug(messageOrError: any, err: any, ...args: any[]): void;
    error(messageOrError: any, err: any, ...args: any[]): void;
    info(messageOrError: any, err: any, ...args: any[]): void;
    trace(messageOrError: any, err: any, ...args: any[]): void;
    warn(messageOrError: any, err: any, ...args: any[]): void;
}
export declare type LogEventContext = {
    time: Date;
    level: LoggerLevel;
    name: string;
};
export declare const INTERFACE_LOG_WRITER = "logger.writer";
export interface LoggerWriter {
    getMappedNames(): string[];
    writeEvent(context: LogEventContext, messageOrError: string | Error | any, err: Error | any, ...args: any[]): any;
}
export declare const INTERFACE_LOG_FORMATTER = "logger.formatter";
export interface LoggerEventFormatter {
    createEvent(context: LogEventContext, messageOrError: string | Error | any, err: Error | any, ...args: any[]): string;
}
export declare class StandardEventFormatter implements LoggerEventFormatter {
    createEvent({ time, level, name }: {
        time: any;
        level: any;
        name: any;
    }, messageOrError: string | Error | any, err: Error | any, ...args: any[]): string;
    static formatArgs(messageOrError: string | Error | any, err: Error | any, ...args: any[]): string;
}
/**
 * Allows runtime change of log output if log writer factory mappings change.
 */
export declare class LoggerWriterProxy implements LoggerWriter {
    private writer;
    constructor(writer: LoggerWriter);
    getMappedNames(): string[];
    setWriter(writer: LoggerWriter): void;
    writeEvent(context: any, ...args: any[]): void;
}
export declare class LoggerWriterConsole implements LoggerWriter {
    level: LoggerLevel;
    formatter: LoggerEventFormatter;
    getMappedNames(): string[];
    writeEvent(context: any, ...args: any[]): void;
}
export declare class LoggerFactory implements FactoryContainer {
    private static inst;
    static getSingleton(): LoggerFactory;
    private writers;
    private prefixToWriters;
    private loggers;
    setWriters(writers: LoggerWriter[]): void;
    getLogger(name: string): Logger;
    has(id: string): boolean;
    resolve<T>(id: string): T;
}
export declare const discover: () => string;
