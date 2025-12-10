/**
 * Key derivation functions using Argon2id (primary) or scrypt (fallback).
 * Used to derive encryption keys from passwords securely.
 */

import { scryptSync, randomBytes } from 'crypto';
import { hash as argon2Hash } from 'argon2';
import { KdfError } from '../logging/errors';
import type { Argon2idParams, ScryptParams } from '../types';

export const DEFAULT_ARGON2_PARAMS: Argon2idParams = {
  memory: 65536, // 64 MB
  time: 3, // 3 iterations
  parallelism: 1,
  salt: randomBytes(16),
};

export const DEFAULT_SCRYPT_PARAMS: ScryptParams = {
  N: 2 ** 15, // 32768
  r: 8,
  p: 1,
  dkLen: 32,
  salt: randomBytes(16),
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
 * @param password - The password buffer to derive from.
 * @param params - Optional parameters object with salt, memory, time, parallelism
 * @returns Object with key, salt, and KDF metadata.
 * @throws KdfError if derivation fails.
 */
export async function deriveKeyArgon2id(password: Buffer, params?: Partial<Argon2idParams>): Promise<KdfResult> {
  const mergedParams = { ...DEFAULT_ARGON2_PARAMS, ...params };
  const saltBuf = mergedParams.salt || randomBytes(16);

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const key = await argon2Hash(password, {
      salt: saltBuf,
      memory: mergedParams.memory,
      time: mergedParams.time,
      parallelism: mergedParams.parallelism,
      raw: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any); // raw: true returns Buffer

    return {
      key: Buffer.isBuffer(key) ? key : Buffer.from(key),
      salt: saltBuf,
      meta: {
        type: 'argon2id',
        salt: saltBuf.toString('base64'),
        params: { ...mergedParams, salt: saltBuf },
      },
    };
  } catch (e) {
    throw new KdfError('Argon2id key derivation failed', { cause: String(e) });
  }
}

/**
 * Derives a 32-byte key from a password using scrypt (fallback).
 * @param password - The password buffer to derive from.
 * @param params - Optional parameters object with N, r, p, dkLen, salt
 * @returns Object with key, salt, and KDF metadata.
 * @throws KdfError if derivation fails.
 */
export async function deriveKeyScrypt(password: Buffer, params?: Partial<ScryptParams>): Promise<KdfResult> {
  const mergedParams = { ...DEFAULT_SCRYPT_PARAMS, ...params };
  const saltBuf = mergedParams.salt || randomBytes(16);

  try {
    const key = scryptSync(password, saltBuf, mergedParams.dkLen, {
      N: mergedParams.N,
      r: mergedParams.r,
      p: mergedParams.p,
      maxmem: 128 * 1024 * 1024, // 128MB max
    });

    return {
      key: Buffer.from(key),
      salt: saltBuf,
      meta: {
        type: 'scrypt',
        salt: saltBuf.toString('base64'),
        params: { ...mergedParams, salt: saltBuf },
      },
    };
  } catch (e) {
    throw new KdfError('Scrypt key derivation failed', { cause: String(e) });
  }
}

/**
 * Derives a key from a password, preferring Argon2id.
 * @param password - The password buffer.
 * @param method - 'argon2id' or 'scrypt'.
 * @returns Object with key, salt, and KDF metadata.
 */
export async function deriveKey(password: Buffer, method: 'argon2id' | 'scrypt' = 'argon2id'): Promise<KdfResult> {
  if (method === 'scrypt') {
    return deriveKeyScrypt(password);
  }

  try {
    return await deriveKeyArgon2id(password);
  } catch (e) {
    throw new KdfError('Key derivation failed', { cause: String(e) });
  }
}
