import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import pino, { Logger as PinoLogger, LoggerOptions } from 'pino';

type LogMeta =
  | Record<string, unknown>
  | {
      context?: string;
      requestId?: string;
      userId?: string;
      [k: string]: unknown;
    };

@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logger: PinoLogger;

  constructor() {
    const level =
      process.env.LOG_LEVEL ??
      (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

    const options: LoggerOptions = {
      level,
      base: undefined, // don't spam pid/hostname unless you want it
      timestamp: pino.stdTimeFunctions.isoTime,
      redact: {
        paths: [
          'password',
          'pass',
          'token',
          'accessToken',
          'refreshToken',
          'authorization',
          'headers.authorization',
          'headers.cookie',
          'cookie',
        ],
        remove: true,
      },
    };

    const transport =
      process.env.NODE_ENV !== 'production'
        ? pino.transport({
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
              singleLine: false,
            },
          })
        : undefined;

    this.logger = pino(options, transport as any);
  }

  /**
   * Create a child logger with shared bindings (context, requestId, userId, etc.)
   * Usage:
   *   const log = this.logger.with({ context: 'UsersService', requestId });
   *   log.info('created user', { userId });
   */
  with(bindings: LogMeta): LoggerService {
    const child = this.logger.child(bindings as Record<string, unknown>);
    return this.fromExisting(child);
  }

  private fromExisting(existing: PinoLogger): LoggerService {
    // small hack to reuse same class shape
    const inst = Object.create(LoggerService.prototype) as LoggerService;
    (inst as any).logger = existing;
    return inst;
  }

  log(message: any, ...optionalParams: any[]) {
    const { msg, meta } = this.normalize(message, optionalParams);
    this.logger.info(meta, msg);
  }

  error(message: any, ...optionalParams: any[]) {
    const { msg, meta } = this.normalize(message, optionalParams);

    // If last param is an Error, attach it properly
    const err = optionalParams.find((p) => p instanceof Error);
    if (err) {
      this.logger.error({ ...meta, err }, msg);
      return;
    }

    this.logger.error(meta, msg);
  }

  warn(message: any, ...optionalParams: any[]) {
    const { msg, meta } = this.normalize(message, optionalParams);
    this.logger.warn(meta, msg);
  }

  debug(message: any, ...optionalParams: any[]) {
    const { msg, meta } = this.normalize(message, optionalParams);
    this.logger.debug(meta, msg);
  }

  verbose(message: any, ...optionalParams: any[]) {
    const { msg, meta } = this.normalize(message, optionalParams);
    this.logger.trace(meta, msg);
  }

  setLogLevels(levels: string[]) {
    // Nest calls this sometimes; we can map the highest priority one
    // Order: error > warn > log > debug > verbose
    const pick = (levels ?? []).map(String);
    const level = pick.includes('verbose')
      ? 'trace'
      : pick.includes('debug')
        ? 'debug'
        : pick.includes('log')
          ? 'info'
          : pick.includes('warn')
            ? 'warn'
            : pick.includes('error')
              ? 'error'
              : (process.env.LOG_LEVEL ?? 'info');

    this.logger.level = level;
  }

  // ---- helpers ----

  private normalize(message: any, optionalParams: any[]) {
    // Allow:
    // log('hello')
    // log('hello', { requestId })
    // log({ msg: 'hello', userId })
    // log('hello', 'UsersService')  // Nest-style context
    let msg = '';
    let meta: Record<string, unknown> = {};

    if (typeof message === 'string') {
      msg = message;
    } else if (message && typeof message === 'object') {
      // If they pass an object, try to pull msg, keep the rest as meta
      const m = message.msg ?? message.message;
      msg = typeof m === 'string' ? m : JSON.stringify(message);
      meta = { ...(message as Record<string, unknown>) };
      delete (meta as any).msg;
      delete (meta as any).message;
    } else {
      msg = String(message);
    }

    // Optional params can contain:
    // - meta object
    // - Nest context string
    // - Error
    for (const p of optionalParams) {
      if (!p) continue;

      if (typeof p === 'string') {
        meta.context = meta.context ?? p;
        continue;
      }

      if (p instanceof Error) {
        // handled in error(), ignore here
        continue;
      }

      if (typeof p === 'object') {
        meta = { ...meta, ...(p as Record<string, unknown>) };
      }
    }

    return { msg, meta };
  }
}
