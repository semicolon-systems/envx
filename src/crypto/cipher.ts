/**
 * AES-256-GCM cipher operations for encrypting/decrypting environment values.
 * Each value gets a unique random nonce for authenticated encryption.
 */

import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { CipherError, DecryptionError } from '../logging/errors';

const CIPHER_ALGORITHM = 'aes-256-gcm';
const NONCE_LENGTH = 12; // bytes
const KEY_LENGTH = 32; // bytes for AES-256

/**
 * Encrypts a plaintext value using AES-256-GCM.
 * Returns ciphertext, nonce, and auth tag for transmission/storage.
 * @param plaintext - The value to encrypt.
 * @param key - 32-byte encryption key.
 * @returns Object with ciphertext, nonce, and tag (all base64).
 * @throws CipherError if encryption fails.
 */
export function encryptValue(plaintext: string, key: Buffer): { ciphertext: string; nonce: string; tag: string } {
  if (key.length !== KEY_LENGTH) {
    throw new CipherError('Invalid key length for AES-256', { expected: KEY_LENGTH, got: key.length });
  }

  try {
    const nonce = randomBytes(NONCE_LENGTH);
    const plaintextBuf = Buffer.from(plaintext, 'utf8');
    const cipher = createCipheriv(CIPHER_ALGORITHM, key, nonce);
    const ciphertext = Buffer.concat([cipher.update(plaintextBuf), cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
      ciphertext: ciphertext.toString('base64'),
      nonce: nonce.toString('base64'),
      tag: tag.toString('base64'),
    };
  } catch (e) {
    if (e instanceof CipherError) throw e;
    throw new CipherError('Encryption failed', { cause: String(e) });
  }
}

/**
 * Decrypts a ciphertext value using AES-256-GCM.
 * Verifies authentication tag to detect tampering.
 * @param ciphertext - Base64-encoded encrypted value.
 * @param key - 32-byte encryption key.
 * @param nonce - Base64-encoded nonce.
 * @param tag - Base64-encoded auth tag.
 * @returns Decrypted plaintext string.
 * @throws DecryptionError if decryption or verification fails.
 */
export function decryptValue(ciphertext: string, key: Buffer, nonce: string, tag: string): string {
  if (key.length !== KEY_LENGTH) {
    throw new DecryptionError('Invalid key length for AES-256', { expected: KEY_LENGTH, got: key.length });
  }

  try {
    const ciphertextBuf = Buffer.from(ciphertext, 'base64');
    const nonceBuf = Buffer.from(nonce, 'base64');
    const tagBuf = Buffer.from(tag, 'base64');

    const decipher = createDecipheriv(CIPHER_ALGORITHM, key, nonceBuf);
    decipher.setAuthTag(tagBuf);
    const plaintext = Buffer.concat([decipher.update(ciphertextBuf), decipher.final()]);

    return plaintext.toString('utf8');
  } catch (e) {
    if (e instanceof DecryptionError) throw e;
    throw new DecryptionError('Decryption failed or data was tampered', { cause: String(e) });
  }
}
