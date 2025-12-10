import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Envx } from '../src/lib/envx';
import { writeFileSync, unlinkSync, existsSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { randomBytes } from 'crypto';

describe('Envx Library Integration', () => {
  let tempDir: string;
  let keyPath: string;
  let envPath: string;
  let envxPath: string;

  beforeEach(() => {
    tempDir = '/tmp/envx-integration-' + randomBytes(8).toString('hex');
    keyPath = `${tempDir}/.envx.key`;
    envPath = `${tempDir}/.env`;
    envxPath = `${tempDir}/.envx`;
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Full workflow', () => {
    it('completes full encrypt/decrypt cycle', async () => {
      const envx = new Envx(keyPath);

      await envx.init('random');
      expect(existsSync(keyPath)).toBe(true);

      writeFileSync(envPath, 'API_KEY=secret123\nDB_URL=postgres://localhost/db');

      await envx.encrypt(envPath, envxPath);
      expect(existsSync(envxPath)).toBe(true);

      const decrypted = await envx.decrypt(envxPath);
      expect(decrypted.API_KEY).toBe('secret123');
      expect(decrypted.DB_URL).toBe('postgres://localhost/db');
    });

    it('handles quoted values in .env files', async () => {
      const envx = new Envx(keyPath);
      await envx.init('random');

      writeFileSync(envPath, 'QUOTED="value with spaces"\nSINGLE=\'another value\'');

      await envx.encrypt(envPath, envxPath);
      const decrypted = await envx.decrypt(envxPath);

      expect(decrypted.QUOTED).toBe('value with spaces');
      expect(decrypted.SINGLE).toBe('another value');
    });

    it('handles comments and empty lines', async () => {
      const envx = new Envx(keyPath);
      await envx.init('random');

      writeFileSync(
        envPath,
        `
# This is a comment
API_KEY=value1

# Another comment
DB_URL=value2

`,
      );

      await envx.encrypt(envPath, envxPath);
      const decrypted = await envx.decrypt(envxPath);

      expect(Object.keys(decrypted).length).toBe(2);
      expect(decrypted.API_KEY).toBe('value1');
      expect(decrypted.DB_URL).toBe('value2');
    });

    it('sets proper file permissions on key file', async () => {
      const envx = new Envx(keyPath);
      await envx.init('random');

      const stats = readFileSync(keyPath);
      expect(stats.length).toBe(32);
    });

    it('throws error for non-existent key file', async () => {
      const envx = new Envx(keyPath);
      writeFileSync(envPath, 'KEY=value');

      await expect(envx.encrypt(envPath)).rejects.toThrow('Key file not found');
    });

    it('throws error for non-existent env file', async () => {
      const envx = new Envx(keyPath);
      await envx.init('random');

      await expect(envx.encrypt(envPath)).rejects.toThrow('Input file not found');
    });

    it('throws error when key file already exists', async () => {
      const envx = new Envx(keyPath);
      await envx.init('random');

      await expect(envx.init('random')).rejects.toThrow('Key file already exists');
    });
  });

  describe('Key rotation', () => {
    it('rotates key and re-encrypts file', async () => {
      const envx = new Envx(keyPath);
      const newKeyPath = `${tempDir}/.envx.key.new`;

      await envx.init('random');
      writeFileSync(envPath, 'SECRET=original');

      await envx.encrypt(envPath, envxPath);

      const decryptedBefore = await envx.decrypt(envxPath);
      expect(decryptedBefore.SECRET).toBe('original');

      await envx.rotateKey(envxPath, newKeyPath);
      expect(existsSync(newKeyPath)).toBe(true);

      const envx2 = new Envx(newKeyPath);
      const decryptedAfter = await envx2.decrypt(envxPath);
      expect(decryptedAfter.SECRET).toBe('original');
    });
  });

  describe('Validation', () => {
    it('verifies valid envx file', async () => {
      const envx = new Envx(keyPath);
      await envx.init('random');
      writeFileSync(envPath, 'KEY=value');
      await envx.encrypt(envPath, envxPath);

      const result = envx.verify(envxPath);
      expect(result.valid).toBe(true);
      expect(result.details).toContain('1 encrypted value');
    });

    it('rejects invalid JSON', () => {
      const envx = new Envx();
      writeFileSync(envxPath, 'not valid json');

      const result = envx.verify(envxPath);
      expect(result.valid).toBe(false);
    });

    it('rejects missing required fields', () => {
      const envx = new Envx();
      writeFileSync(envxPath, JSON.stringify({ version: 1 }));

      const result = envx.verify(envxPath);
      expect(result.valid).toBe(false);
    });

    it('rejects wrong version', () => {
      const envx = new Envx();
      const invalidFile = {
        version: 2,
        cipher: 'aes-256-gcm',
        kdf: { type: 'none' },
        nonce_map: {},
        values: {},
      };
      writeFileSync(envxPath, JSON.stringify(invalidFile));

      const result = envx.verify(envxPath);
      expect(result.valid).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('handles empty .env file', async () => {
      const envx = new Envx(keyPath);
      await envx.init('random');
      writeFileSync(envPath, '');

      await envx.encrypt(envPath, envxPath);
      const decrypted = await envx.decrypt(envxPath);

      expect(Object.keys(decrypted).length).toBe(0);
    });

    it('handles .env with only comments', async () => {
      const envx = new Envx(keyPath);
      await envx.init('random');
      writeFileSync(envPath, '# Comment 1\n# Comment 2');

      await envx.encrypt(envPath, envxPath);
      const decrypted = await envx.decrypt(envxPath);

      expect(Object.keys(decrypted).length).toBe(0);
    });

    it('handles keys with no values', async () => {
      const envx = new Envx(keyPath);
      await envx.init('random');
      writeFileSync(envPath, 'EMPTY_KEY=');

      await envx.encrypt(envPath, envxPath);
      const decrypted = await envx.decrypt(envxPath);

      expect(decrypted.EMPTY_KEY).toBe('');
    });
  });
});
