/**
 * Custom error classes for envx-secure with metadata support.
 * All errors inherit from EnvxError and include context for debugging.
 */

/**
 * Base error class for all envx errors.
 */
export class EnvxError extends Error {
  public readonly code: string;
  public readonly metadata: Record<string, unknown>;

  constructor(code: string, message: string, metadata: Record<string, unknown> = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.metadata = metadata;
    Object.setPrototypeOf(this, EnvxError.prototype);
  }
}

/**
 * Thrown when cryptographic operations fail.
 */
export class CipherError extends EnvxError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super('CIPHER_ERROR', message, metadata);
    Object.setPrototypeOf(this, CipherError.prototype);
  }
}

/**
 * Thrown when key derivation fails.
 */
export class KdfError extends EnvxError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super('KDF_ERROR', message, metadata);
    Object.setPrototypeOf(this, KdfError.prototype);
  }
}

/**
 * Thrown when validation fails.
 */
export class ValidationError extends EnvxError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super('VALIDATION_ERROR', message, metadata);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Thrown when file I/O fails.
 */
export class FileError extends EnvxError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super('FILE_ERROR', message, metadata);
    Object.setPrototypeOf(this, FileError.prototype);
  }
}

/**
 * Thrown when configuration or key is missing.
 */
export class MissingKeyError extends EnvxError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super('MISSING_KEY', message, metadata);
    Object.setPrototypeOf(this, MissingKeyError.prototype);
  }
}

/**
 * Thrown when decryption fails due to tampering.
 */
export class DecryptionError extends EnvxError {
  constructor(message: string, metadata: Record<string, unknown> = {}) {
    super('DECRYPTION_ERROR', message, metadata);
    Object.setPrototypeOf(this, DecryptionError.prototype);
  }
}
