export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

class ConsoleLogger implements Logger {
  private minLevel: LogLevel;
  private levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(minLevel: LogLevel = 'info') {
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.minLevel];
  }

  private format(level: LogLevel, message: string, context?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const ctx = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${ctx}`;
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      console.debug(this.format('debug', message, context));
    }
  }

  info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      console.info(this.format('info', message, context));
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      console.warn(this.format('warn', message, context));
    }
  }

  error(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      console.error(this.format('error', message, context));
    }
  }
}

export const logger: Logger = new ConsoleLogger((process.env.LOG_LEVEL as LogLevel) || 'info');
