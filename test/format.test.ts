import { describe, it, expect } from 'vitest';
import { parseEnvx, buildEnvxFile, validateEnvx } from '../src/format/envx-format';
import { ValidationError } from '../src/utils/errors';

describe('Format Module', () => {
  describe('parseEnvx', () => {
    it('parses valid envx file', () => {
      const json = JSON.stringify({
        version: 1,
        cipher: 'aes-256-gcm',
        kdf: {
          type: 'argon2id',
          salt: 'base64salt',
          params: { memory: 65536, time: 3, parallelism: 1 },
        },
        nonce_map: { TEST_KEY: 'base64nonce' },
        values: { TEST_KEY: 'base64cipher' },
        meta: { created_at: new Date().toISOString() },
      });
      const result = parseEnvx(json);
      expect(result.version).toBe(1);
      expect(result.cipher).toBe('aes-256-gcm');
    });

    it('rejects missing required fields', () => {
      const json = JSON.stringify({
        version: 1,
        cipher: 'aes-256-gcm',
      });
      expect(() => parseEnvx(json)).toThrow();
    });

    it('rejects invalid cipher', () => {
      const json = JSON.stringify({
        version: 1,
        cipher: 'aes256',
        kdf: {
          type: 'argon2id',
          salt: 'base64salt',
          params: { memory: 1, time: 1, parallelism: 1 },
        },
        nonce_map: { KEY: 'nonce' },
        values: { KEY: 'cipher' },
      });
      expect(() => parseEnvx(json)).toThrow();
    });

    it('rejects mismatched keys and nonces', () => {
      const json = JSON.stringify({
        version: 1,
        cipher: 'xchacha20-poly1305',
        kdf: {
          type: 'argon2id',
          salt: 'base64salt',
          params: { memory: 1, time: 1, parallelism: 1 },
        },
        nonce_map: { KEY1: 'nonce' },
        values: { KEY2: 'cipher' },
      });
      expect(() => parseEnvx(json)).toThrow(ValidationError);
    });
  });

  describe('buildEnvxFile', () => {
    it('builds valid envx file with defaults', () => {
      const result = buildEnvxFile({
        kdf: { type: 'argon2id', salt: 'salt', params: { memory: 1, time: 1, parallelism: 1 } },
        nonce_map: {},
        values: {},
      });
      expect(result.version).toBe(1);
      expect(result.cipher).toBe('aes-256-gcm');
    });
  });
});
