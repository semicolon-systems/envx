/**
 * Key Derivation Functions (KDFs) for password-based encryption.
 * 
 * Primary: Argon2id
 * - Memory-hard (resists GPU/ASIC attacks)
 * - Side-channel resistant
 * - Winner of Password Hashing Competition (2015)
 * - Parameters chosen for ~100ms on modern hardware
 * 
 * Fallback: scrypt
 * - Older but still secure memory-hard KDF
 * - Used if Argon2 unavailable or for compatibility
 * 
 * Security considerations:
 * - Random 128-bit salt per key (prevents rainbow tables)
 * - Parameters tuned for 2024 hardware (will need adjustment over time)
 * - Salt is stored with encrypted file (public, non-secret)
 * - Password is never logged or stored
 */

import { scryptSync, randomBytes } from 'crypto';
import { hash as argon2Hash, argon2id } from 'argon2';
import { KdfError } from '../utils/errors';
import type { Argon2idParams, ScryptParams } from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('KDF');

// Argon2id parameters
// Tuned for ~100-200ms on modern CPU (2024)
// Memory: 64 MB (resists GPU attacks)
// Time: 3 iterations (balances security and usability)
// Parallelism: 1 (simplifies deployment, still secure)
export const DEFAULT_ARGON2_PARAMS: Argon2idParams = {
  memory: 65536,    // 64 MB in KB
  time: 3,          // Iterations
  parallelism: 1,   // Threads
  salt: randomBytes(16), // 128-bit salt
};

// scrypt parameters (fallback)
// N=2^15 provides similar security to Argon2id above
export const DEFAULT_SCRYPT_PARAMS: ScryptParams = {
  N: 32768,        // CPU/memory cost (2^15)
  r: 8,            // Block size
  p: 1,            // Parallelization
  dkLen: 32,       // Output length (256 bits)
  salt: randomBytes(16),
};

export type KdfMeta = { 
  type: string; 
  salt: string; 
  params: Argon2idParams | ScryptParams 
};

export interface KdfResult {
  key: Buffer;
  salt: Buffer;
  meta: KdfMeta;
}

/**
 * Derive a 256-bit key from a password using Argon2id.
 * 
 * Argon2id combines Argon2i (side-channel resistant) and Argon2d (GPU-resistant).
 * It's the recommended variant for password hashing as of 2024.
 * 
 * @param password - Password as Buffer (will be wiped by caller)
 * @param params - Optional custom parameters (uses secure defaults if omitted)
 * @returns Object with derived key, salt, and metadata
 * @throws KdfError if derivation fails
 */
export async function deriveKeyArgon2id(
  password: Buffer, 
  params?: Partial<Argon2idParams>
): Promise<KdfResult> {
  const mergedParams = { ...DEFAULT_ARGON2_PARAMS, ...params };
  const saltBuf = mergedParams.salt || randomBytes(16);

  logger.debug('deriveKeyArgon2id', `Deriving key with ${mergedParams.memory} KB memory, ${mergedParams.time} iterations`);

  try {
    // Use Argon2id variant (balanced security)
    const key = await argon2Hash(password, {
      type: argon2id,
      salt: saltBuf,
      memoryCost: mergedParams.memory,
      timeCost: mergedParams.time,
      parallelism: mergedParams.parallelism,
      raw: true, // Return Buffer, not encoded string
      hashLength: 32, // 256 bits
    });

    return {
      key: Buffer.isBuffer(key) ? key : Buffer.from(key),
      salt: saltBuf,
      meta: {
        type: 'argon2id',
        salt: saltBuf.toString('base64'),
        params: { 
          memory: mergedParams.memory, 
          time: mergedParams.time, 
          parallelism: mergedParams.parallelism,
          salt: saltBuf,
        },
      },
    };
  } catch (e) {
    logger.error('deriveKeyArgon2id', `Derivation failed: ${String(e)}`);
    throw new KdfError(`Argon2id key derivation failed: ${String(e)}`);
  }
}

/**
 * Derive a 256-bit key from a password using scrypt (fallback).
 * 
 * scrypt is a memory-hard KDF that predates Argon2. Still secure,
 * but Argon2id is preferred for new applications.
 * 
 * @param password - Password as Buffer
 * @param params - Optional custom parameters
 * @returns Object with derived key, salt, and metadata
 * @throws KdfError if derivation fails
 */
export async function deriveKeyScrypt(
  password: Buffer, 
  params?: Partial<ScryptParams>
): Promise<KdfResult> {
  const mergedParams = { ...DEFAULT_SCRYPT_PARAMS, ...params };
  const saltBuf = mergedParams.salt || randomBytes(16);

  logger.debug('deriveKeyScrypt', `Deriving key with N=${mergedParams.N}, r=${mergedParams.r}, p=${mergedParams.p}`);

  try {
    const key = scryptSync(password, saltBuf, mergedParams.dkLen, {
      N: mergedParams.N,
      r: mergedParams.r,
      p: mergedParams.p,
      maxmem: 128 * 1024 * 1024, // 128MB max (prevents DoS)
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
          salt: saltBuf,
        },
      },
    };
  } catch (e) {
    logger.error('deriveKeyScrypt', `Derivation failed: ${String(e)}`);
    throw new KdfError(`Scrypt key derivation failed: ${String(e)}`);
  }
}

/**
 * Derive a key from a password using specified method.
 * 
 * Prefers Argon2id but can fall back to scrypt.
 * 
 * @param password - Password as Buffer
 * @param method - KDF method ('argon2id' or 'scrypt')
 * @returns Object with derived key, salt, and metadata
 * @throws KdfError if derivation fails
 */
export async function deriveKey(
  password: Buffer, 
  method: 'argon2id' | 'scrypt' = 'argon2id'
): Promise<KdfResult> {
  if (method === 'scrypt') {
    return deriveKeyScrypt(password);
  }

  try {
    return await deriveKeyArgon2id(password);
  } catch (e) {
    logger.error('deriveKey', `Key derivation failed: ${String(e)}`);
    throw new KdfError(`Key derivation failed: ${String(e)}`);
  }
}
