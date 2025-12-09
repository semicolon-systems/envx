import { createDecipheriv } from 'crypto';
import { DecryptionError } from '../utils/errors';
import { wipeBuffer } from '../utils/memory';

export const decryptValues = async (
  encrypted: Record<string, string>,
  nonceMap: Record<string, string>,
  key: Buffer,
): Promise<Record<string, string>> => {
  if (key.length !== 32) {
    throw new DecryptionError('Invalid key length (expected 32 bytes)');
  }

  const result: Record<string, string> = {};
  for (const [name, cipherBase64] of Object.entries(encrypted)) {
    const nonceBase64 = nonceMap[name];
    if (!nonceBase64) {
      throw new DecryptionError(`Missing nonce for key ${name}`);
    }
    const nonce = Buffer.from(nonceBase64, 'base64');
    const combined = Buffer.from(cipherBase64, 'base64');
    
    // Extract tag (first 16 bytes) and ciphertext
    const tag = combined.subarray(0, 16);
    const ciphertext = combined.subarray(16);
    
    try {
      const decipher = createDecipheriv('aes-256-gcm', key, nonce);
      decipher.setAuthTag(tag);
      let plain = decipher.update(ciphertext, undefined, 'utf8');
      plain += decipher.final('utf8');
      result[name] = plain;
    } catch (error) {
      throw new DecryptionError(`Failed to decrypt ${name}: ${String(error)}`);
    } finally {
      wipeBuffer(nonce);
    }
  }
  return result;
};
