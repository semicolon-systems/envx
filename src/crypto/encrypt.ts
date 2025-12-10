import { randomBytes, createCipheriv } from 'crypto';
import { EncryptionError } from '../utils/errors';
import { wipeBuffer } from '../utils/memory';
import { logger } from '../utils/logger';

export type EncryptionResult = {
  nonceMap: Record<string, string>;
  values: Record<string, string>;
};

/**
 * Encrypts plaintext values using AES-256-GCM with unique nonces per value.
 * Each value receives its own random 12-byte nonce to prevent nonce reuse.
 */
export const encryptValues = async (
  plaintext: Record<string, string>,
  key: Buffer,
): Promise<EncryptionResult> => {
  if (key.length !== 32) {
    throw new EncryptionError('Invalid key length, expected 32 bytes', {
      context: { actual: key.length },
    });
  }

  const nonceMap: Record<string, string> = {};
  const values: Record<string, string> = {};
  const usedNonces = new Set<string>();

  try {
    for (const [name, value] of Object.entries(plaintext)) {
      const valueBuf = Buffer.from(value, 'utf8');

      const nonce = randomBytes(12);
      const nonceB64 = nonce.toString('base64');

      if (usedNonces.has(nonceB64)) {
        wipeBuffer(valueBuf);
        throw new EncryptionError('Nonce collision detected during encryption');
      }

      usedNonces.add(nonceB64);

      const cipher = createCipheriv('aes-256-gcm', key, nonce);
      const ciphertext = Buffer.concat([cipher.update(valueBuf), cipher.final()]);
      const tag = cipher.getAuthTag();

      const combined = Buffer.concat([tag, ciphertext]);

      nonceMap[name] = nonceB64;
      values[name] = combined.toString('base64');

      wipeBuffer(valueBuf);
    }

    logger.info('Encrypted values');

    return { nonceMap, values };
  } catch (e) {
    if (e instanceof EncryptionError) throw e;
    throw new EncryptionError('Encryption operation failed', { cause: e });
  }
};
