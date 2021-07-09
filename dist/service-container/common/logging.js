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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var StandardEventFormatter_1, LoggerFactory_1;
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Provides basic interfaces and some stream-oriented implementations to get you started on adding
 * logging.
 *
 * The typical lifecycle of mapping logger output and getting loggers is as follows:
 *
 * 1. a set of logger writers are loaded and associated with a default log level and 1+ logger names
 * (e.g. `appname`, `appname.service` and `appname2.service`)
 * 2. a consumer asks for a logger by name (e.g. `appname.service.subservice`)
 * 3. the logger factory looks at logger mappings, and the longest matching prefix wins (e.g.
 * `appname.service.subservice` will use `appname.service` since it's most specific)
 * 4. logger is returned using the mapped writer
 *
 * - LoggerFactory
 *   - *LoggerWriter[]
 * - *LoggerWriter
 *   - *LoggerEventFormatter
 * - StandardEventFormatter <- *LoggerEventFormatter
 * - LoggerWriterConsole <- *LoggerWriter
 */
const decorators_1 = require("../decorators");
const console = __importStar(require("console"));
const decorator_1 = require("../../decorator");
exports.ID_LOGGER = 'logger';
const LoggerBundle = decorator_1.BundleDecoratorFactory(exports.ID_LOGGER);
var LoggerLevel;
(function (LoggerLevel) {
    LoggerLevel[LoggerLevel["TRACE"] = 1] = "TRACE";
    LoggerLevel[LoggerLevel["DEBUG"] = 2] = "DEBUG";
    LoggerLevel[LoggerLevel["INFO"] = 3] = "INFO";
    LoggerLevel[LoggerLevel["WARN"] = 4] = "WARN";
    LoggerLevel[LoggerLevel["ERROR"] = 5] = "ERROR";
})(LoggerLevel = exports.LoggerLevel || (exports.LoggerLevel = {}));
const LoggerLevelToLcase = {
    [LoggerLevel.TRACE]: 'trace',
    [LoggerLevel.DEBUG]: 'debug',
    [LoggerLevel.INFO]: 'info',
    [LoggerLevel.WARN]: 'warn',
    [LoggerLevel.ERROR]: 'error',
};
/**
 * Text labels for log levels, as `%-5s`
 */
const LoggerLevelToUcasePadded = {
    [LoggerLevel.TRACE]: 'TRACE',
    [LoggerLevel.DEBUG]: 'DEBUG',
    [LoggerLevel.INFO]: 'INFO ',
    [LoggerLevel.WARN]: 'WARN ',
    [LoggerLevel.ERROR]: 'ERROR ',
};
exports.INTERFACE_LOG_LOGGER = 'logger.logger';
class LoggerWrappingWriter {
    constructor(name, writer) {
        this.name = name;
        this.writer = writer;
    }
    debug(messageOrError, err, ...args) {
        this.writer.writeEvent({
            name: this.name,
            time: new Date(),
            level: LoggerLevel.DEBUG
        }, messageOrError, err, ...args);
    }
    error(messageOrError, err, ...args) {
        this.writer.writeEvent({
            name: this.name,
            time: new Date(),
            level: LoggerLevel.ERROR
        }, messageOrError, err, ...args);
    }
    info(messageOrError, err, ...args) {
        this.writer.writeEvent({
            name: this.name,
            time: new Date(),
            level: LoggerLevel.INFO
        }, messageOrError, err, ...args);
    }
    trace(messageOrError, err, ...args) {
        this.writer.writeEvent({
            name: this.name,
            time: new Date(),
            level: LoggerLevel.TRACE
        }, messageOrError, err, ...args);
    }
    warn(messageOrError, err, ...args) {
        this.writer.writeEvent({
            name: this.name,
            time: new Date(),
            level: LoggerLevel.WARN
        }, messageOrError, err, ...args);
    }
}
exports.LoggerWrappingWriter = LoggerWrappingWriter;
exports.INTERFACE_LOG_WRITER = 'logger.writer';
exports.INTERFACE_LOG_FORMATTER = 'logger.formatter';
let StandardEventFormatter = StandardEventFormatter_1 = class StandardEventFormatter {
    createEvent({ time, level, name }, messageOrError, err, ...args) {
        const iso = time.toISOString().substr(0, 23);
        const tstamp = `${iso.substr(0, 10)} ${iso.substr(11, 12)}`;
        return `${tstamp} [${LoggerLevelToUcasePadded[level]}] [${name}] ${StandardEventFormatter_1.formatArgs(messageOrError, err, ...args)}`;
    }
    static formatArgs(messageOrError, err, ...args) {
        const buff = [];
        let restArgs = args;
        if (messageOrError instanceof Error) {
            buff.push(`${messageOrError.message} ${JSON.stringify({ stacktrace: messageOrError.stack })}`);
            if (err !== undefined)
                restArgs = [err, ...args];
        }
        else if (err instanceof Error) {
            buff.push(messageOrError);
            buff.push(`${err.message} ${JSON.stringify({ stacktrace: err.stack })}`);
        }
        else if (typeof messageOrError == 'string') {
            buff.push(messageOrError);
            if (err !== undefined)
                restArgs = [err, ...args];
        }
        else {
            restArgs = [messageOrError, err, ...args];
        }
        for (const arg of restArgs) {
            if (typeof arg == "object" || arg instanceof Array) {
                buff.push(JSON.stringify(arg));
            }
            else {
                buff.push(arg);
            }
        }
        return buff.join(' ');
    }
};
StandardEventFormatter = StandardEventFormatter_1 = __decorate([
    LoggerBundle,
    decorators_1.Service("logger.formatter.standard", {
        interfaces: [exports.INTERFACE_LOG_FORMATTER]
    })
], StandardEventFormatter);
exports.StandardEventFormatter = StandardEventFormatter;
/**
 * Allows runtime change of log output if log writer factory mappings change.
 */
class LoggerWriterProxy {
    constructor(writer) {
        this.writer = writer;
    }
    getMappedNames() {
        return this.writer.getMappedNames();
    }
    setWriter(writer) {
        this.writer = writer;
    }
    writeEvent(context, ...args) {
        const [msgOrError, err, ...rest] = args;
        this.writer.writeEvent(context, msgOrError, err, ...rest);
    }
}
exports.LoggerWriterProxy = LoggerWriterProxy;
let LoggerWriterConsole = class LoggerWriterConsole {
    constructor() {
        this.level = LoggerLevel.INFO;
        this.formatter = new StandardEventFormatter();
    }
    getMappedNames() {
        return ['*'];
    }
    writeEvent(context, ...args) {
        const { level } = context;
        if (level < this.level) {
            return;
        }
        const methodName = LoggerLevelToLcase[level];
        const [msgOrError, err, ...rest] = args;
        console[methodName](this.formatter.createEvent(context, msgOrError, err, ...rest));
    }
};
LoggerWriterConsole = __decorate([
    LoggerBundle,
    decorators_1.Service("logger.writer.console", {
        interfaces: [exports.INTERFACE_LOG_WRITER]
    })
], LoggerWriterConsole);
exports.LoggerWriterConsole = LoggerWriterConsole;
let LoggerFactory = LoggerFactory_1 = class LoggerFactory {
    constructor() {
        this.writers = [];
        this.prefixToWriters = {
            '*': new LoggerWriterConsole()
        };
        this.loggers = {};
    }
    static getSingleton() {
        if (!this.inst) {
            this.inst = new LoggerFactory_1();
        }
        return this.inst;
    }
    // @todo fixedLoggers -- supports logger.logger interface services
    setWriters(writers) {
        for (const writer of writers) {
            for (const prefix of writer.getMappedNames()) {
                if (this.prefixToWriters[prefix]) {
                    continue;
                }
                this.prefixToWriters[prefix] = writer;
                this.writers.push(writer);
            }
        }
    }
    getLogger(name) {
        if (this.loggers[name]) {
            return this.loggers[name];
        }
        let p = '*';
        for (const prefix of Object.keys(this.prefixToWriters)) {
            if (name == prefix || name.startsWith(prefix)) {
                if (prefix.length > p.length) {
                    p = prefix;
                }
            }
        }
        const writer = new LoggerWriterProxy(this.prefixToWriters[p]);
        // @todo record name->proxy
        this.loggers[name] = new LoggerWrappingWriter(name, writer);
        return this.loggers[name];
    }
    has(id) {
        return true;
    }
    resolve(id) {
        return this.getLogger(id);
    }
};
LoggerFactory.inst = undefined;
__decorate([
    __param(0, decorators_1.Inject({ matchInterface: exports.INTERFACE_LOG_WRITER, matchCriteria: { min: 0 } }))
], LoggerFactory.prototype, "setWriters", null);
__decorate([
    decorators_1.Factory
], LoggerFactory, "getSingleton", null);
LoggerFactory = LoggerFactory_1 = __decorate([
    LoggerBundle,
    decorators_1.Service('logger.loggerFactory', {
        isFactory: true
    })
], LoggerFactory);
exports.LoggerFactory = LoggerFactory;
exports.discover = () => {
    [LoggerFactory, LoggerWriterConsole];
    return exports.ID_LOGGER;
};
//# sourceMappingURL=logging.js.map