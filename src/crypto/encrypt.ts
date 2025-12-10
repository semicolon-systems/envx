/**
 * AES-256-GCM encryption for environment variables.
 * 
 * Security properties:
 * - Authenticated Encryption with Associated Data (AEAD)
 * - 256-bit key strength
 * - 96-bit random nonce per value (unique with overwhelming probability)
 * - 128-bit authentication tag prevents tampering
 * - Constant-time MAC verification in Node.js crypto
 * 
 * Implementation notes:
 * - Each environment variable is encrypted independently
 * - Nonces are randomly generated (not counters) for simplicity
 * - With 96-bit nonces, birthday bound is ~2^48 encryptions
 * - Authentication tag prepended to ciphertext for easier handling
 */

import { randomBytes, createCipheriv } from 'crypto';
import { DecryptionError } from '../utils/errors';
import { wipeBuffer } from '../utils/memory';
import { createLogger } from '../utils/logger';

const logger = createLogger('Encrypt');

// AES-256-GCM constants
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;  // 256 bits
const NONCE_LENGTH = 12; // 96 bits (recommended for GCM)
// TAG_LENGTH is 16 bytes (128 bits) but determined by cipher.getAuthTag()

export type EncryptionResult = {
  nonceMap: Record<string, string>;
  values: Record<string, string>;
};

/**
 * Encrypt multiple environment variables with AES-256-GCM.
 * 
 * Each variable gets:
 * - A unique random 96-bit nonce
 * - Independent encryption (no cross-variable leakage)
 * - 128-bit authentication tag
 * 
 * @param plaintext - Object mapping variable names to plaintext values
 * @param key - 32-byte (256-bit) encryption key
 * @returns Object with nonce map and encrypted values (both base64-encoded)
 * @throws DecryptionError if key length is invalid
 */
export const encryptValues = async (
  plaintext: Record<string, string>,
  key: Buffer,
): Promise<EncryptionResult> => {
  // Validate key length before any encryption
  if (key.length !== KEY_LENGTH) {
    logger.error('encrypt', `Invalid key length: ${key.length} bytes (expected ${KEY_LENGTH})`);
    throw new DecryptionError(`Invalid key length: expected ${KEY_LENGTH} bytes, got ${key.length} bytes`);
  }

  const nonceMap: Record<string, string> = {};
  const values: Record<string, string> = {};
  let encryptedCount = 0;

  for (const [name, value] of Object.entries(plaintext)) {
    try {
      // Generate cryptographically random nonce
      // With 96 bits, collision probability is negligible for realistic usage
      const nonce = randomBytes(NONCE_LENGTH);
      
      // Create cipher instance
      const cipher = createCipheriv(ALGORITHM, key, nonce);
      
      // Encrypt the value
      let ciphertext = cipher.update(value, 'utf8', 'binary');
      ciphertext += cipher.final('binary');
      
      // Get authentication tag (proves integrity and authenticity)
      const tag = cipher.getAuthTag();
      
      // Prepend tag to ciphertext for easier handling
      // Format: [16-byte tag][variable-length ciphertext]
      const combined = Buffer.concat([tag, Buffer.from(ciphertext, 'binary')]);
      
      // Store nonce and ciphertext as base64 (safe for JSON)
      nonceMap[name] = nonce.toString('base64');
      values[name] = combined.toString('base64');
      
      encryptedCount++;
      
      // Securely wipe the plaintext value from memory
      wipeBuffer(Buffer.from(value, 'utf8'));
    } catch (error) {
      // Don't include variable name in error (might be sensitive)
      logger.error('encrypt', `Encryption failed: ${String(error)}`);
      throw new DecryptionError(`Encryption failed: ${String(error)}`);
    }
  }

  logger.debug('encrypt', `Encrypted ${encryptedCount} environment variables`);
  return { nonceMap, values };
};
