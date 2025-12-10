import { createDecipheriv } from 'crypto';
import { DecryptionError } from '../utils/errors';
import { wipeBuffer } from '../utils/memory';
import { logger } from '../utils/logger';

/**
 * Decrypts values encrypted with AES-256-GCM.
 * Verifies authentication tags to detect tampering before returning plaintext.
 */
export const decryptValues = async (
  encrypted: Record<string, string>,
  nonceMap: Record<string, string>,
  key: Buffer,
): Promise<Record<string, string>> => {
  if (key.length !== 32) {
    throw new DecryptionError('Invalid key length, expected 32 bytes', {
      context: { actual: key.length },
    });
  }

  const result: Record<string, string> = {};
  const errors: Array<{ key: string; reason: string }> = [];

  for (const [name, cipherBase64] of Object.entries(encrypted)) {
    const nonceBase64 = nonceMap[name];
    if (!nonceBase64) {
      errors.push({ key: name, reason: 'Missing nonce' });
      continue;
    }

    let nonce: Buffer | undefined;
    let combined: Buffer | undefined;

    try {
      nonce = Buffer.from(nonceBase64, 'base64');
      combined = Buffer.from(cipherBase64, 'base64');

      if (combined.length < 16) {
        throw new DecryptionError('Invalid ciphertext length');
      }

      const tag = combined.subarray(0, 16);
      const ciphertext = combined.subarray(16);

      const decipher = createDecipheriv('aes-256-gcm', key, nonce);
      decipher.setAuthTag(tag);

      const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

      result[name] = plaintext.toString('utf8');

      wipeBuffer(plaintext);
    } catch (error) {
      const reason = error instanceof DecryptionError ? error.message : 'Authentication failed';
      errors.push({ key: name, reason });
    } finally {
      if (nonce) wipeBuffer(nonce);
      if (combined) wipeBuffer(combined);
    }
  }

  if (errors.length > 0) {
    throw new DecryptionError('Decryption failed for one or more values', {
      context: { failedCount: errors.length, totalCount: Object.keys(encrypted).length },
    });
  }

  logger.info('Decrypted values');

  return result;
};
