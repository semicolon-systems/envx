import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Envx } from '../src/lib/envx';
import { writeFileSync, unlinkSync, existsSync, mkdirSync, rmSync } from 'fs';
import { randomBytes } from 'crypto';

describe('CLI Library', () => {
  let tempDir: string;
  let keyPath: string;

  beforeEach(() => {
    tempDir = '/tmp/envx-test-' + randomBytes(8).toString('hex');
    keyPath = tempDir + '/.envx.key';
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Envx class', () => {
    it('initializes with random key', async () => {
      const envx = new Envx(keyPath);
      const result = await envx.init('random');
      expect(result.keyPath).toBe(keyPath);
      expect(existsSync(keyPath)).toBe(true);
      if (existsSync(keyPath)) unlinkSync(keyPath);
    });

    it('verifies valid envx file', () => {
      const envx = new Envx();
      const validFile = JSON.stringify({
        version: 1,
        cipher: 'aes-256-gcm',
        kdf: { type: 'argon2id', salt: 'salt', params: { memory: 1, time: 1, parallelism: 1 } },
        nonce_map: {},
        values: {},
      });
      const testFile = '/tmp/test-envx-' + randomBytes(4).toString('hex') + '.envx';
      writeFileSync(testFile, validFile);
      const result = envx.verify(testFile);
      expect(result.valid).toBe(true);
      unlinkSync(testFile);
    });

    it('rejects invalid envx file', () => {
      const envx = new Envx();
      const invalidFile = JSON.stringify({ version: 2 });
      const testFile = '/tmp/test-envx-' + randomBytes(4).toString('hex') + '.envx';
      writeFileSync(testFile, invalidFile);
      const result = envx.verify(testFile);
      expect(result.valid).toBe(false);
      unlinkSync(testFile);
    });
  });
});
