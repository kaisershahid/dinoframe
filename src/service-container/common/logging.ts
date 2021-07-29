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
import { Factory, Inject, Service } from "../decorators";
import * as console from "console";
import { BundleDecoratorFactory } from "../../decorator";
import { FactoryContainer } from "../types";

export const ID_LOGGER = "logger";
const LoggerBundle = BundleDecoratorFactory(ID_LOGGER);

export enum LoggerLevel {
  TRACE = 1,
  DEBUG,
  INFO,
  WARN,
  ERROR,
}

const LoggerLevelToLcase: Record<LoggerLevel, keyof typeof console> = {
  [LoggerLevel.TRACE]: "trace",
  [LoggerLevel.DEBUG]: "debug",
  [LoggerLevel.INFO]: "info",
  [LoggerLevel.WARN]: "warn",
  [LoggerLevel.ERROR]: "error",
};

/**
 * Text labels for log levels, as `%-5s`
 */
const LoggerLevelToUcasePadded: Record<LoggerLevel, string> = {
  [LoggerLevel.TRACE]: "TRACE",
  [LoggerLevel.DEBUG]: "DEBUG",
  [LoggerLevel.INFO]: "INFO ",
  [LoggerLevel.WARN]: "WARN ",
  [LoggerLevel.ERROR]: "ERROR ",
};

export const INTERFACE_LOG_LOGGER = "logger.logger";

export interface Logger {
  trace(
    messageOrError: string | Error | any,
    err?: Error | any,
    ...args: any[]
  );

  debug(
    messageOrError: string | Error | any,
    err?: Error | any,
    ...args: any[]
  );

  info(messageOrError: string | Error | any, err?: Error | any, ...args: any[]);

  warn(messageOrError: string | Error | any, err?: Error | any, ...args: any[]);

  error(
    messageOrError: string | Error | any,
    err?: Error | any,
    ...args: any[]
  );
}

export class LoggerWrappingWriter implements Logger {
  private name: string;
  private writer: LoggerWriter;

  constructor(name: string, writer: LoggerWriter) {
    this.name = name;
    this.writer = writer;
  }

  debug(messageOrError: any, err: any, ...args: any[]) {
    this.writer.writeEvent(
      {
        name: this.name,
        time: new Date(),
        level: LoggerLevel.DEBUG,
      },
      messageOrError,
      err,
      ...args
    );
  }

  error(messageOrError: any, err: any, ...args: any[]) {
    this.writer.writeEvent(
      {
        name: this.name,
        time: new Date(),
        level: LoggerLevel.ERROR,
      },
      messageOrError,
      err,
      ...args
    );
  }

  info(messageOrError: any, err: any, ...args: any[]) {
    this.writer.writeEvent(
      {
        name: this.name,
        time: new Date(),
        level: LoggerLevel.INFO,
      },
      messageOrError,
      err,
      ...args
    );
  }

  trace(messageOrError: any, err: any, ...args: any[]) {
    this.writer.writeEvent(
      {
        name: this.name,
        time: new Date(),
        level: LoggerLevel.TRACE,
      },
      messageOrError,
      err,
      ...args
    );
  }

  warn(messageOrError: any, err: any, ...args: any[]) {
    this.writer.writeEvent(
      {
        name: this.name,
        time: new Date(),
        level: LoggerLevel.WARN,
      },
      messageOrError,
      err,
      ...args
    );
  }
}

export type LogEventContext = {
  time: Date;
  level: LoggerLevel;
  name: string;
};

export const INTERFACE_LOG_WRITER = "logger.writer";

export interface LoggerWriter {
  getMappedNames(): string[];

  writeEvent(
    context: LogEventContext,
    messageOrError: string | Error | any,
    err: Error | any,
    ...args: any[]
  );
}

export const INTERFACE_LOG_FORMATTER = "logger.formatter";

export interface LoggerEventFormatter {
  createEvent(
    context: LogEventContext,
    messageOrError: string | Error | any,
    err: Error | any,
    ...args: any[]
  ): string;
}

@LoggerBundle
@Service("logger.formatter.standard", {
  interfaces: [INTERFACE_LOG_FORMATTER],
})
export class StandardEventFormatter implements LoggerEventFormatter {
  createEvent(
    { time, level, name },
    messageOrError: string | Error | any,
    err: Error | any,
    ...args: any[]
  ) {
    const iso = time.toISOString().substr(0, 23);
    const tstamp = `${iso.substr(0, 10)} ${iso.substr(11, 12)}`;
    return `${tstamp} [${
      LoggerLevelToUcasePadded[level]
    }] [${name}] ${StandardEventFormatter.formatArgs(
      messageOrError,
      err,
      ...args
    )}`;
  }

  static formatArgs(
    messageOrError: string | Error | any,
    err: Error | any,
    ...args: any[]
  ): string {
    const buff: string[] = [];
    let restArgs: any[] = args;

    if (messageOrError instanceof Error) {
      buff.push(
        `${messageOrError.message} ${JSON.stringify({
          stacktrace: messageOrError.stack,
        })}`
      );
      if (err !== undefined) restArgs = [err, ...args];
    } else if (err instanceof Error) {
      buff.push(messageOrError);
      buff.push(`${err.message} ${JSON.stringify({ stacktrace: err.stack })}`);
    } else if (typeof messageOrError == "string") {
      buff.push(messageOrError);
      if (err !== undefined) restArgs = [err, ...args];
    } else {
      restArgs = [messageOrError, err, ...args];
    }

    for (const arg of restArgs) {
      if (typeof arg == "object" || arg instanceof Array) {
        buff.push(JSON.stringify(arg));
      } else {
        buff.push(arg);
      }
    }

    return buff.join(" ");
  }
}

/**
 * Allows runtime change of log output if log writer factory mappings change.
 */
export class LoggerWriterProxy implements LoggerWriter {
  private writer: LoggerWriter;

  constructor(writer: LoggerWriter) {
    this.writer = writer;
  }

  getMappedNames(): string[] {
    return this.writer.getMappedNames();
  }

  setWriter(writer: LoggerWriter) {
    this.writer = writer;
  }

  writeEvent(context, ...args: any[]) {
    const [msgOrError, err, ...rest] = args;
    this.writer.writeEvent(context, msgOrError, err, ...rest);
  }
}

@LoggerBundle
@Service("logger.writer.console", {
  interfaces: [INTERFACE_LOG_WRITER],
})
export class LoggerWriterConsole implements LoggerWriter {
  level = LoggerLevel.INFO;
  formatter: LoggerEventFormatter = new StandardEventFormatter();

  getMappedNames(): string[] {
    return ["*"];
  }

  writeEvent(context, ...args: any[]) {
    const { level } = context;
    if (level < this.level) {
      return;
    }

    const methodName = LoggerLevelToLcase[level];
    const [msgOrError, err, ...rest] = args;
    console[methodName](
      this.formatter.createEvent(context, msgOrError, err, ...rest)
    );
  }
}

@LoggerBundle
@Service("logger.loggerFactory", {
  isFactory: true,
})
export class LoggerFactory implements FactoryContainer {
  private static inst: LoggerFactory = undefined as any;

  @Factory
  public static getSingleton() {
    if (!this.inst) {
      this.inst = new LoggerFactory();
    }

    return this.inst;
  }

  private writers: LoggerWriter[] = [];
  private prefixToWriters: Record<string, LoggerWriter> = {
    "*": new LoggerWriterConsole(),
  };
  private loggers: Record<string, Logger> = {};

  // @todo fixedLoggers -- supports logger.logger interface services

  setWriters(
    @Inject({ matchInterface: INTERFACE_LOG_WRITER, matchCriteria: { min: 0 } })
    writers: LoggerWriter[]
  ) {
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

  getLogger(name: string) {
    if (this.loggers[name]) {
      return this.loggers[name];
    }

    let p = "*";
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

  has(id: string): boolean {
    return true;
  }

  resolve<T>(id: string): T {
    return this.getLogger(id) as any;
  }
}

export const discover = () => {
  [LoggerFactory, LoggerWriterConsole];
  return ID_LOGGER;
};
