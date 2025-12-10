/**
 * Structured logging layer for envx-secure.
 * All logs are JSON with timestamp, level, message, operation, and context.
 * Never logs secrets or sensitive data.
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogContext {
  operation: string;
  context?: Record<string, unknown>;
  error?: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  operation: string;
  context?: Record<string, unknown>;
  error?: { name: string; message: string; stack?: string };
}

/**
 * Create a structured log entry and output it.
 * @param level - Log severity level.
 * @param message - Human-readable log message.
 * @param ctx - Operation context and metadata.
 */
export function log(level: LogLevel, message: string, ctx: LogContext = { operation: 'unknown' }): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    operation: ctx.operation,
  };

  if (ctx.context && Object.keys(ctx.context).length > 0) {
    entry.context = ctx.context;
  }

  if (ctx.error instanceof Error) {
    entry.error = {
      name: ctx.error.name,
      message: ctx.error.message,
      stack: ctx.error.stack,
    };
  } else if (ctx.error) {
    entry.error = {
      name: 'UnknownError',
      message: String(ctx.error),
    };
  }

  // eslint-disable-next-line no-console
  console[level === 'error' || level === 'warn' ? level : 'log'](JSON.stringify(entry));
}

/**
 * Convenience functions for common log levels.
 */
export const logger = {
  info: (message: string, ctx: LogContext) => log('info', message, ctx),
  warn: (message: string, ctx: LogContext) => log('warn', message, ctx),
  error: (message: string, ctx: LogContext) => log('error', message, ctx),
  debug: (message: string, ctx: LogContext) => log('debug', message, ctx),
};
