/**
 * Global TypeScript interfaces and types for envx-secure.
 */

/**
 * KDF metadata for key derivation functions.
 */
export interface KdfMeta {
  type: 'argon2id' | 'scrypt';
  salt: string;
  params: Argon2idParams | ScryptParams;
}

export interface Argon2idParams {
  memory: number;
  time: number;
  parallelism: number;
  salt?: Buffer;
}

export interface ScryptParams {
  N: number;
  r: number;
  p: number;
  dkLen: number;
  salt?: Buffer;
}

/**
 * KDF result from key derivation.
 */
export interface KdfResult {
  key: Buffer;
  salt: Buffer;
  meta: KdfMeta;
}

/**
 * Nonce map for tracking per-value nonces.
 */
export type NonceMap = Record<string, string>;

/**
 * Encrypted envx file format.
 */
export interface EnvxFile {
  version: 1;
  cipher: 'xchacha20-poly1305';
  kdf: {
    type: 'argon2id' | 'scrypt' | 'none';
    salt?: string;
    params?: Argon2idParams | ScryptParams;
  };
  nonce_map: NonceMap;
  values: Record<string, string>;
  meta?: Record<string, unknown> & { created_at?: string };
}

/**
 * Result of encryption operation.
 */
export interface EncryptionResult {
  nonceMap: NonceMap;
  values: Record<string, string>;
}
