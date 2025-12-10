import { describe, it, expect, beforeEach } from 'vitest';
import {
  deriveKeyArgon2id,
  deriveKeyScrypt,
  DEFAULT_ARGON2_PARAMS,
  DEFAULT_SCRYPT_PARAMS,
} from '../src/crypto/kdf';
import { randomBytes } from 'crypto';

describe('KDF Module', () => {
  let password: Buffer;

  beforeEach(() => {
    password = Buffer.from('test-password');
  });

  describe('Argon2id', () => {
    it('derives consistent key from same password and salt', async () => {
      const salt = randomBytes(16);
      const result1 = await deriveKeyArgon2id(password, {
        ...DEFAULT_ARGON2_PARAMS,
        salt: Buffer.from(salt),
      });
      const result2 = await deriveKeyArgon2id(password, {
        ...DEFAULT_ARGON2_PARAMS,
        salt: Buffer.from(salt),
      });
      expect(result1.key).toEqual(result2.key);
    });

    it('derives different key from different salt', async () => {
      const salt1 = randomBytes(16);
      const salt2 = randomBytes(16);
      const result1 = await deriveKeyArgon2id(password, {
        ...DEFAULT_ARGON2_PARAMS,
        salt: Buffer.from(salt1),
      });
      const result2 = await deriveKeyArgon2id(password, {
        ...DEFAULT_ARGON2_PARAMS,
        salt: Buffer.from(salt2),
      });
      expect(result1.key).not.toEqual(result2.key);
    });

    it('returns 32-byte key', async () => {
      const { key } = await deriveKeyArgon2id(password);
      expect(key.length).toBe(32);
    });
  });

  describe('scrypt', () => {
    it('derives consistent key from same password and salt', async () => {
      const salt = randomBytes(16);
      const params = { N: 1024, r: 8, p: 1, dkLen: 32 };
      const result1 = await deriveKeyScrypt(password, { ...params, salt: Buffer.from(salt) });
      const result2 = await deriveKeyScrypt(password, { ...params, salt: Buffer.from(salt) });
      expect(result1.key).toEqual(result2.key);
    });

    it('derives different key from different password', async () => {
      const pwd1 = Buffer.from('password1');
      const pwd2 = Buffer.from('password2');
      const params = { N: 1024, r: 8, p: 1, dkLen: 32 };
      const result1 = await deriveKeyScrypt(pwd1, params);
      const result2 = await deriveKeyScrypt(pwd2, params);
      expect(result1.key).not.toEqual(result2.key);
    });

    it('returns correct dkLen', async () => {
      const { key } = await deriveKeyScrypt(password, {
        N: 1024,
        r: 8,
        p: 1,
        dkLen: 64,
      });
      expect(key.length).toBe(64);
    });
  });
});
