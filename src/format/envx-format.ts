import Ajv from 'ajv';
import type { ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import schema from './schema.json';
import { ValidationError } from '../utils/errors';

export type EnvxKdf =
  | { type: 'argon2id'; salt: string; params: { memory: number; time: number; parallelism: number } }
  | { type: 'scrypt'; salt: string; params: { N: number; r: number; p: number; dkLen: number } }
  | { type: 'none' };

export interface EnvxFile {
  version: 1;
  cipher: 'aes-256-gcm';
  kdf: EnvxKdf;
  nonce_map: Record<string, string>;
  values: Record<string, string>;
  meta?: Record<string, unknown> & { created_at?: string };
}

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);
const validateFn = ajv.compile(schema as Record<string, unknown>);

export const validateEnvx = (data: unknown): EnvxFile => {
  if (!validateFn(data)) {
    const errors = (validateFn.errors ?? []) as ErrorObject[];
    const message = errors.map((e) => `${e.instancePath} ${e.message ?? ''}`).join('; ') ||
      'Invalid envx file';
    throw new ValidationError(message);
  }
  const typed = data as EnvxFile;
  // Enforce nonce per value and matching keys
  for (const key of Object.keys(typed.values)) {
    if (!typed.nonce_map[key]) {
      throw new ValidationError(`Missing nonce for key ${key}`);
    }
  }
  for (const key of Object.keys(typed.nonce_map)) {
    if (!typed.values[key]) {
      throw new ValidationError(`Missing ciphertext for key ${key}`);
    }
  }
  if (typed.version !== 1) {
    throw new ValidationError(`Unsupported version ${typed.version}`);
  }
  if (typed.cipher !== 'aes-256-gcm') {
    throw new ValidationError(`Unsupported cipher ${typed.cipher}`);
  }
  return typed;
};

export const parseEnvx = (json: string): EnvxFile => {
  try {
    const data = JSON.parse(json);
    return validateEnvx(data);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(`Invalid JSON: ${String(error)}`);
  }
};

export const buildEnvxFile = (
  payload: Omit<EnvxFile, 'version' | 'cipher'>,
): EnvxFile => ({
  version: 1,
  cipher: 'aes-256-gcm',
  ...payload,
});
