export class EnvxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvxError';
  }
}

export class ValidationError extends EnvxError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class DecryptionError extends EnvxError {
  constructor(message: string) {
    super(message);
    this.name = 'DecryptionError';
  }
}

export class KdfError extends EnvxError {
  constructor(message: string) {
    super(message);
    this.name = 'KdfError';
  }
}

export class FileExistsError extends EnvxError {
  constructor(message: string) {
    super(message);
    this.name = 'FileExistsError';
  }
}

export class MissingKeyError extends EnvxError {
  constructor(message: string) {
    super(message);
    this.name = 'MissingKeyError';
  }
}
