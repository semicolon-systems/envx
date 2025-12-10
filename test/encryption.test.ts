import { describe, it, expect } from 'vitest';
import { encryptValues } from '../src/crypto/encrypt';
import { decryptValues } from '../src/crypto/decrypt';
import { randomBytes } from 'crypto';

describe('Encryption/Decryption Integration', () => {
  describe('Round-trip encryption', () => {
    it('encrypts and decrypts simple values correctly', async () => {
      const key = randomBytes(32);
      const plaintext = {
        API_KEY: 'sk_test_abc123',
        DATABASE_URL: 'postgresql://localhost/mydb',
      };

      const { nonceMap, values } = await encryptValues(plaintext, key);
      const decrypted = await decryptValues(values, nonceMap, key);

      expect(decrypted).toEqual(plaintext);
    });

    it('handles empty strings', async () => {
      const key = randomBytes(32);
      const plaintext = { EMPTY: '' };

      const { nonceMap, values } = await encryptValues(plaintext, key);
      const decrypted = await decryptValues(values, nonceMap, key);

      expect(decrypted).toEqual(plaintext);
    });

    it('handles special characters', async () => {
      const key = randomBytes(32);
      const plaintext = {
        SPECIAL: "!@#$%^&*(){}[]|;:',.<>?/~`",
        QUOTES: 'value"with"quotes',
        EQUALS: 'value=with=equals',
      };

      const { nonceMap, values } = await encryptValues(plaintext, key);
      const decrypted = await decryptValues(values, nonceMap, key);

      expect(decrypted).toEqual(plaintext);
    });

    it('handles unicode characters', async () => {
      const key = randomBytes(32);
      const plaintext = {
        UNICODE: 'Hello_世界_Привет_🌍',
        EMOJI: '🔐🔑🎯',
      };

      const { nonceMap, values } = await encryptValues(plaintext, key);
      const decrypted = await decryptValues(values, nonceMap, key);

      expect(decrypted).toEqual(plaintext);
    });

    it('handles multiline values', async () => {
      const key = randomBytes(32);
      const plaintext = {
        PRIVATE_KEY: `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC7
-----END PRIVATE KEY-----`,
      };

      const { nonceMap, values } = await encryptValues(plaintext, key);
      const decrypted = await decryptValues(values, nonceMap, key);

      expect(decrypted).toEqual(plaintext);
    });

    it('handles very long values', async () => {
      const key = randomBytes(32);
      const longValue = 'x'.repeat(10000);
      const plaintext = { LONG_VALUE: longValue };

      const { nonceMap, values } = await encryptValues(plaintext, key);
      const decrypted = await decryptValues(values, nonceMap, key);

      expect(decrypted).toEqual(plaintext);
    });

    it('handles many keys', async () => {
      const key = randomBytes(32);
      const plaintext: Record<string, string> = {};

      for (let i = 0; i < 100; i++) {
        plaintext[`KEY_${i}`] = `value_${i}`;
      }

      const { nonceMap, values } = await encryptValues(plaintext, key);
      const decrypted = await decryptValues(values, nonceMap, key);

      expect(decrypted).toEqual(plaintext);
    });

    it('generates unique nonces for each value', async () => {
      const key = randomBytes(32);
      const plaintext = {
        KEY1: 'value1',
        KEY2: 'value2',
        KEY3: 'value3',
      };

      const { nonceMap } = await encryptValues(plaintext, key);
      const nonces = Object.values(nonceMap);

      const uniqueNonces = new Set(nonces);
      expect(uniqueNonces.size).toBe(nonces.length);
    });

    it('produces different ciphertext for same plaintext', async () => {
      const key = randomBytes(32);
      const plaintext = { KEY: 'same_value' };

      const result1 = await encryptValues(plaintext, key);
      const result2 = await encryptValues(plaintext, key);

      expect(result1.values.KEY).not.toBe(result2.values.KEY);
      expect(result1.nonceMap.KEY).not.toBe(result2.nonceMap.KEY);
    });
  });

  describe('Security', () => {
    it('rejects wrong key', async () => {
      const key1 = randomBytes(32);
      const key2 = randomBytes(32);
      const plaintext = { KEY: 'value' };

      const { nonceMap, values } = await encryptValues(plaintext, key1);

      await expect(decryptValues(values, nonceMap, key2)).rejects.toThrow();
    });

    it('rejects invalid key length', async () => {
      const shortKey = randomBytes(16);
      const plaintext = { KEY: 'value' };

      await expect(encryptValues(plaintext, shortKey)).rejects.toThrow('Invalid key length');
    });

    it('rejects tampered ciphertext', async () => {
      const key = randomBytes(32);
      const plaintext = { KEY: 'value' };

      const { nonceMap, values } = await encryptValues(plaintext, key);

      const cipherBuffer = Buffer.from(values.KEY, 'base64');
      cipherBuffer[20] ^= 0xff;
      values.KEY = cipherBuffer.toString('base64');

      await expect(decryptValues(values, nonceMap, key)).rejects.toThrow();
    });

    it('rejects missing nonce', async () => {
      const key = randomBytes(32);
      const plaintext = { KEY: 'value' };

      const { values } = await encryptValues(plaintext, key);

      await expect(decryptValues(values, {}, key)).rejects.toThrow();
    });

    it('rejects tampered authentication tag', async () => {
      const key = randomBytes(32);
      const plaintext = { KEY: 'value' };

      const { nonceMap, values } = await encryptValues(plaintext, key);

      const cipherBuffer = Buffer.from(values.KEY, 'base64');
      cipherBuffer[0] ^= 0xff;
      values.KEY = cipherBuffer.toString('base64');

      await expect(decryptValues(values, nonceMap, key)).rejects.toThrow();
    });
  });
});
