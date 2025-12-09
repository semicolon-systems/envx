import { randomBytes, createCipheriv } from 'crypto';
import { DecryptionError } from '../utils/errors';
import { wipeBuffer } from '../utils/memory';

export type EncryptionResult = {
  nonceMap: Record<string, string>;
  values: Record<string, string>;
};

export const encryptValues = async (
  plaintext: Record<string, string>,
  key: Buffer,
): Promise<EncryptionResult> => {
  if (key.length !== 32) {
    throw new DecryptionError('Invalid key length (expected 32 bytes)');
  }

  const nonceMap: Record<string, string> = {};
  const values: Record<string, string> = {};

  for (const [name, value] of Object.entries(plaintext)) {
    const valueBuf = Buffer.from(value, 'utf8');
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, nonce);
    let ciphertext = cipher.update(value, 'utf8', 'binary');
    ciphertext += cipher.final('binary');
    const tag = cipher.getAuthTag();
    const combined = Buffer.concat([tag, Buffer.from(ciphertext, 'binary')]);
    nonceMap[name] = nonce.toString('base64');
    values[name] = combined.toString('base64');
    wipeBuffer(valueBuf);
  }

  return { nonceMap, values };
};

export const ensureSodiumReady = async (): Promise<void> => {
  // No initialization needed for node crypto
};
