/**
 * Validates envx configuration files against the JSON schema.
 * Uses AJV for fast, declarative validation.
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import schema from './schema.json';
import { ValidationError } from '../utils/errors';
import type { EnvxFile } from '../types';

/**
 * Validates an envx file object against the schema.
 * @param data - The parsed envx file data.
 * @throws ValidationError if the data doesn't match the schema.
 * @returns The validated data, strongly typed.
 */
export function validateEnvxFile(data: unknown): EnvxFile {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema as Record<string, unknown>);

  if (!validate(data)) {
    const errors = (validate.errors ?? []).map((e) => `${e.instancePath} ${e.message ?? ''}`).join('; ');
    throw new ValidationError(`Invalid envx file format: ${errors}`);
  }

  return data as EnvxFile;
}
