export interface ErrorOptions {
  cause?: unknown;
  context?: Record<string, unknown>;
}

export class EnvxError extends Error {
  public readonly context?: Record<string, unknown>;
  public readonly cause?: unknown;

  constructor(message: string, options?: ErrorOptions) {
    super(message);
    this.name = 'EnvxError';
    this.context = options?.context;
    this.cause = options?.cause;
    if (options?.cause instanceof Error && options.cause.stack) {
      this.stack = `${this.stack}\nCaused by: ${options.cause.stack}`;
    }
  }
}

export class ValidationError extends EnvxError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ValidationError';
  }
}

export class DecryptionError extends EnvxError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'DecryptionError';
  }
}

export class KdfError extends EnvxError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'KdfError';
  }
}

export class FileExistsError extends EnvxError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'FileExistsError';
  }
}

export class MissingKeyError extends EnvxError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'MissingKeyError';
  }
}

export class EncryptionError extends EnvxError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'EncryptionError';
  }
}
