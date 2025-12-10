/**
 * Key derivation functions using Argon2id (primary) or scrypt (fallback).
 * Used to derive encryption keys from passwords securely.
 */

import { scryptSync, randomBytes } from 'crypto';
import { hash as argon2Hash } from 'argon2';
import { KdfError } from '../utils/errors';
import { logger } from '../utils/logger';
import type { Argon2idParams, ScryptParams } from '../types';

export const DEFAULT_ARGON2_PARAMS: Readonly<Omit<Argon2idParams, 'salt'>> = {
  memory: 65536,
  time: 3,
  parallelism: 1,
};

export const DEFAULT_SCRYPT_PARAMS: Readonly<Omit<ScryptParams, 'salt'>> = {
  N: 2 ** 15,
  r: 8,
  p: 1,
  dkLen: 32,
};

// Export types for public API
export type { Argon2idParams, ScryptParams };
export type KdfMeta = { type: string; salt: string; params: Argon2idParams | ScryptParams };

export interface KdfResult {
  key: Buffer;
  salt: Buffer;
  meta: KdfMeta;
}

/**
 * Derives a 32-byte key from a password using Argon2id.
 * Argon2id provides protection against both side-channel and GPU attacks.
 */
export async function deriveKeyArgon2id(
  password: Buffer,
  params?: Partial<Argon2idParams>,
): Promise<KdfResult> {
  const saltBuf = params?.salt || randomBytes(16);
  const mergedParams = {
    ...DEFAULT_ARGON2_PARAMS,
    ...params,
    salt: saltBuf,
  };

  try {
    logger.debug('Deriving key with Argon2id');

    const key = await argon2Hash(password, {
      salt: saltBuf,
      memoryCost: mergedParams.memory,
      timeCost: mergedParams.time,
      parallelism: mergedParams.parallelism,
      raw: true,
      type: 2,
    });

    const keyBuffer = Buffer.isBuffer(key) ? key : Buffer.from(key as Uint8Array);

    if (keyBuffer.length !== 32) {
      throw new KdfError('Argon2id produced incorrect key length', {
        context: { expected: 32, actual: keyBuffer.length },
      });
    }

    return {
      key: keyBuffer,
      salt: saltBuf,
      meta: {
        type: 'argon2id',
        salt: saltBuf.toString('base64'),
        params: {
          memory: mergedParams.memory,
          time: mergedParams.time,
          parallelism: mergedParams.parallelism,
        },
      },
    };
  } catch (e) {
    if (e instanceof KdfError) throw e;
    throw new KdfError('Argon2id key derivation failed', { cause: e });
  }
}

/**
 * Derives a 32-byte key from a password using scrypt.
 * Used as fallback when Argon2id is unavailable.
 */
export async function deriveKeyScrypt(
  password: Buffer,
  params?: Partial<ScryptParams>,
): Promise<KdfResult> {
  const saltBuf = params?.salt || randomBytes(16);
  const mergedParams = {
    ...DEFAULT_SCRYPT_PARAMS,
    ...params,
    salt: saltBuf,
  };

  try {
    logger.debug('Deriving key with scrypt');

    const key = scryptSync(password, saltBuf, mergedParams.dkLen, {
      N: mergedParams.N,
      r: mergedParams.r,
      p: mergedParams.p,
      maxmem: 128 * 1024 * 1024,
    });

    return {
      key: Buffer.from(key),
      salt: saltBuf,
      meta: {
        type: 'scrypt',
        salt: saltBuf.toString('base64'),
        params: {
          N: mergedParams.N,
          r: mergedParams.r,
          p: mergedParams.p,
          dkLen: mergedParams.dkLen,
        },
      },
    };
  } catch (e) {
    throw new KdfError('Scrypt key derivation failed', { cause: e });
  }
}

/**
 * Derives a key from a password, preferring Argon2id.
 */
export async function deriveKey(
  password: Buffer,
  method: 'argon2id' | 'scrypt' = 'argon2id',
): Promise<KdfResult> {
  if (method === 'scrypt') {
    return deriveKeyScrypt(password);
  }

  try {
    return await deriveKeyArgon2id(password);
  } catch (e) {
    throw new KdfError('Key derivation failed', { cause: e });
  }
}
