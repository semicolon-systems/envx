/**
 * AES-256-GCM decryption for environment variables.
 * 
 * Security properties:
 * - Verifies 128-bit authentication tag before returning plaintext
 * - Constant-time MAC comparison (provided by Node.js crypto)
 * - Fails immediately on any tampering or corruption
 * - No partial results on failure (all-or-nothing)
 * 
 * Implementation notes:
 * - Authentication tag is prepended to ciphertext
 * - Each variable is decrypted independently
 * - Nonce must match the one used during encryption
 * - Any MAC verification failure aborts the entire operation
 */

import { createDecipheriv } from 'crypto';
import { DecryptionError } from '../utils/errors';
import { wipeBuffer } from '../utils/memory';
import { createLogger } from '../utils/logger';

const logger = createLogger('Decrypt');

// AES-256-GCM constants (must match encrypt.ts)
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const TAG_LENGTH = 16;

/**
 * Decrypt multiple environment variables with AES-256-GCM.
 * 
 * Performs authenticated decryption: if ANY authentication tag is invalid,
 * the entire operation fails. This prevents use of tampered data.
 * 
 * @param encrypted - Object mapping variable names to base64-encoded ciphertext
 * @param nonceMap - Object mapping variable names to base64-encoded nonces
 * @param key - 32-byte (256-bit) encryption key
 * @returns Object mapping variable names to plaintext values
 * @throws DecryptionError if key is wrong, data is tampered, or nonces are missing
 */
export const decryptValues = async (
  encrypted: Record<string, string>,
  nonceMap: Record<string, string>,
  key: Buffer,
): Promise<Record<string, string>> => {
  // Validate key length
  if (key.length !== KEY_LENGTH) {
    logger.error('decrypt', `Invalid key length: ${key.length} bytes`);
    throw new DecryptionError(`Invalid key length: expected ${KEY_LENGTH} bytes, got ${key.length} bytes`);
  }

  const result: Record<string, string> = {};
  const buffers: Buffer[] = []; // Track buffers to wipe on error

  try {
    for (const [name, cipherBase64] of Object.entries(encrypted)) {
      // Validate nonce exists for this variable
      const nonceBase64 = nonceMap[name];
      if (!nonceBase64) {
        throw new DecryptionError(`Missing nonce for variable: ${name}`);
      }

      // Decode from base64
      const nonce = Buffer.from(nonceBase64, 'base64');
      const combined = Buffer.from(cipherBase64, 'base64');
      buffers.push(nonce, combined);

      // Validate minimum length (tag + at least 1 byte ciphertext)
      if (combined.length < TAG_LENGTH) {
        throw new DecryptionError(`Invalid ciphertext length for variable: ${name}`);
      }

      // Extract authentication tag (first 16 bytes) and ciphertext
      const tag = combined.subarray(0, TAG_LENGTH);
      const ciphertext = combined.subarray(TAG_LENGTH);

      try {
        // Create decipher instance
        const decipher = createDecipheriv(ALGORITHM, key, nonce);
        
        // Set authentication tag BEFORE decryption
        decipher.setAuthTag(tag);
        
        // Decrypt and verify MAC
        // If MAC verification fails, Node.js crypto throws an error
        let plain = decipher.update(ciphertext, undefined, 'utf8');
        plain += decipher.final('utf8');
        
        result[name] = plain;
      } catch (error) {
        // MAC verification failure or decryption error
        // Don't include variable name (might be sensitive)
        logger.error('decrypt', 'MAC verification failed or corrupt data');
        throw new DecryptionError(
          `Decryption failed: wrong key, tampered data, or file corruption`
        );
      }
    }

    logger.debug('decrypt', `Decrypted ${Object.keys(result).length} variables`);
    return result;
  } finally {
    // Always wipe sensitive buffers, even on error
    buffers.forEach(buf => wipeBuffer(buf));
  }
};
