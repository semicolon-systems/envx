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

      let nonce: Buffer;
      let nonceB64: string;
      let attempts = 0;

      do {
        nonce = randomBytes(12);
        nonceB64 = nonce.toString('base64');
        attempts++;

        if (attempts > 100) {
          throw new EncryptionError('Failed to generate unique nonce after 100 attempts');
        }
      } while (usedNonces.has(nonceB64));

      usedNonces.add(nonceB64);

      const cipher = createCipheriv('aes-256-gcm', key, nonce);
      const ciphertext = Buffer.concat([cipher.update(valueBuf), cipher.final()]);
      const tag = cipher.getAuthTag();

      const combined = Buffer.concat([tag, ciphertext]);

      nonceMap[name] = nonceB64;
      values[name] = combined.toString('base64');

      wipeBuffer(valueBuf);
    }

    logger.debug('Encrypted values', { count: Object.keys(values).length });

    return { nonceMap, values };
  } catch (e) {
    if (e instanceof EncryptionError) throw e;
    throw new EncryptionError('Encryption operation failed', { cause: e });
  }
};
