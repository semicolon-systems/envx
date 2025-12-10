/**
 * Structured logging utility for envx.
 * 
 * Design principles:
 * - Never log secrets, keys, passwords, or plaintext values
 * - Log only operationally useful information
 * - Use consistent format for easy parsing
 * - Include context for debugging production issues
 * 
 * Log levels:
 * - info: Normal operations (encrypt, decrypt, init)
 * - warn: Unexpected but recoverable conditions
 * - error: Failures that prevent operation
 * - debug: Detailed information for development (not production)
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  operation: string;
  message: string;
}

export interface Logger {
  info(operation: string, message: string): void;
  warn(operation: string, message: string): void;
  error(operation: string, message: string): void;
  debug(operation: string, message: string): void;
}

/**
 * Create a logger instance for a specific component.
 * 
 * @param component - Component name (e.g., 'Envx', 'KDF', 'CLI')
 * @returns Logger instance with level-specific methods
 */
export function createLogger(component: string): Logger {
  const log = (level: LogLevel, operation: string, message: string): void => {
    // Skip debug logs unless explicitly enabled
    if (level === 'debug' && !process.env.ENVX_DEBUG) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component,
      operation,
      message,
    };

    // Output to stderr for errors/warnings, stdout for info
    // eslint-disable-next-line no-console
    const stream = level === 'error' || level === 'warn' ? console.error : console.log;
    
    // Format: [timestamp] LEVEL component.operation: message
    stream(`[${entry.timestamp}] ${entry.level.toUpperCase()} ${entry.component}.${entry.operation}: ${entry.message}`);
  };

  return {
    info: (operation: string, message: string) => log('info', operation, message),
    warn: (operation: string, message: string) => log('warn', operation, message),
    error: (operation: string, message: string) => log('error', operation, message),
    debug: (operation: string, message: string) => log('debug', operation, message),
  };
}
