/*
 * Structured, safe logger for envx.
 * - Emits compact JSON logs with timestamp, level and message.
 * - Automatically sanitizes context to avoid including secrets (keys, salts, nonces, passwords etc.).
 * - Keeps a simple public API compatible with the previous implementation.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

const levels: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };
const minLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

const sensitiveKeyPatterns = [/password/i, /passphrase/i, /secret/i, /key$/i, /salt/i, /nonce/i, /iv/i, /tag/i, /cipher/i, /ciphertext/i, /value/i];

function sanitizeContext(ctx?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!ctx) return undefined;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(ctx)) {
    const isSensitive = sensitiveKeyPatterns.some((rx) => rx.test(k));
    if (isSensitive) {
      out[k] = '[REDACTED]';
      continue;
    }
    // Avoid printing Buffers or large binary data
    if (v instanceof Buffer) {
      out[k] = '[REDACTED_BUFFER]';
      continue;
    }
    out[k] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

function emit(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  if (levels[level] < levels[minLevel]) return;
  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };
  const ctx = sanitizeContext(context);
  if (ctx) entry.context = ctx;
  const out = JSON.stringify(entry);
  // Use console methods so output is visible in tests and CI; keep minimal/no secrets
  if (level === 'error') console.error(out);
  else if (level === 'warn') console.warn(out);
  else if (level === 'info') console.info(out);
  else console.debug(out);
}

export const logger: Logger = {
  debug: (m, c) => emit('debug', m, c),
  info: (m, c) => emit('info', m, c),
  warn: (m, c) => emit('warn', m, c),
  error: (m, c) => emit('error', m, c),
};
