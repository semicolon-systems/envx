import { readFileSync, writeFileSync, existsSync } from 'fs';
import { randomBytes } from 'crypto';
import { deriveKey } from '../crypto/kdf';
import type { KdfMeta } from '../crypto/kdf';
import { encryptValues } from '../crypto/encrypt';
import { decryptValues } from '../crypto/decrypt';
import { buildEnvxFile, parseEnvx } from '../format/envx-format';
import type { EnvxFile } from '../format/envx-format';
import { MissingKeyError, FileExistsError, ValidationError } from '../utils/errors';
import { wipeBuffer } from '../utils/memory';
import { logger } from '../utils/logger';

export class Envx {
  private keyPath: string;

  constructor(keyPath: string = '.envx.key') {
    this.keyPath = keyPath;
  }

  async init(
    mode: 'random' | 'password',
    password?: Buffer,
  ): Promise<{ keyPath: string; salt?: string; kdfMeta?: KdfMeta }> {
    if (existsSync(this.keyPath)) {
      throw new FileExistsError(`Key file already exists at ${this.keyPath}`);
    }

    if (mode === 'random') {
      const key = randomBytes(32);
      writeFileSync(this.keyPath, key, { mode: 0o600 });
      wipeBuffer(key);
      logger.info('Initialized random key');
      return { keyPath: this.keyPath };
    }

    if (!password) {
      throw new ValidationError('Password required for password-based key derivation');
    }

    const { key, salt, meta: kdfMeta } = await deriveKey(password, 'argon2id');
    writeFileSync(this.keyPath, key, { mode: 0o600 });
    wipeBuffer(key);
    logger.info('Initialized password-derived key');
    return { keyPath: this.keyPath, salt: salt.toString('base64'), kdfMeta };
  }

  async encrypt(envFile: string, outputPath?: string): Promise<EnvxFile> {
    if (!existsSync(envFile)) {
      throw new ValidationError(`Input file not found: ${envFile}`);
    }

    const envContent = readFileSync(envFile, 'utf8');
    const plaintext: Record<string, string> = {};

    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;

      const key = trimmed.substring(0, eqIndex).trim();
      let value = trimmed.substring(eqIndex + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.substring(1, value.length - 1);
      }

      if (key) {
        plaintext[key] = value;
      }
    }

    if (Object.keys(plaintext).length === 0) {
      logger.warn('No environment variables found in input file');
    }

    const key = this.loadKey();
    const { nonceMap, values } = await encryptValues(plaintext, key);
    wipeBuffer(key);

    const envxFile = buildEnvxFile({
      kdf: { type: 'none' },
      nonce_map: nonceMap,
      values,
      meta: { created_at: new Date().toISOString() },
    });

    const path = outputPath ?? envFile.replace(/\.env$/, '.envx');
    writeFileSync(path, JSON.stringify(envxFile, null, 2), { mode: 0o600 });
    logger.info('Encrypted environment file');

    return envxFile;
  }

  async decrypt(envxFile: string): Promise<Record<string, string>> {
    if (!existsSync(envxFile)) {
      throw new ValidationError(`Input file not found: ${envxFile}`);
    }

    const json = readFileSync(envxFile, 'utf8');
    const parsed = parseEnvx(json);
    const key = this.loadKey();
    const plaintext = await decryptValues(parsed.values, parsed.nonce_map, key);
    wipeBuffer(key);

    logger.info('Decrypted environment file');

    return plaintext;
  }

  private loadKey(): Buffer {
    if (!existsSync(this.keyPath)) {
      throw new MissingKeyError(`Key file not found at ${this.keyPath}`);
    }

    const key = readFileSync(this.keyPath);

    if (key.length !== 32) {
      throw new ValidationError(`Invalid key file: expected 32 bytes, got ${key.length}`);
    }

    return key;
  }

  async rotateKey(envxPath: string, newKeyPath: string): Promise<void> {
    if (existsSync(newKeyPath)) {
      throw new FileExistsError(`New key path already exists: ${newKeyPath}`);
    }

    if (!existsSync(envxPath)) {
      throw new ValidationError(`Envx file not found: ${envxPath}`);
    }

    const plaintext = await this.decrypt(envxPath);

    const newKey = randomBytes(32);
    writeFileSync(newKeyPath, newKey, { mode: 0o600 });

    const oldKeyPath = this.keyPath;
    this.keyPath = newKeyPath;

    const key = this.loadKey();
    const { nonceMap, values } = await encryptValues(plaintext, key);
    wipeBuffer(key);

    const envxFile = buildEnvxFile({
      kdf: { type: 'none' },
      nonce_map: nonceMap,
      values,
      meta: {
        created_at: new Date().toISOString(),
        rotated_from: oldKeyPath,
      },
    });

    writeFileSync(envxPath, JSON.stringify(envxFile, null, 2), { mode: 0o600 });

    logger.info('Rotated encryption key');
  }

  verify(envxPath: string): { valid: boolean; details: string } {
    try {
      if (!existsSync(envxPath)) {
        return { valid: false, details: 'File not found' };
      }

      const json = readFileSync(envxPath, 'utf8');
      const parsed = parseEnvx(json);

      const keyCount = Object.keys(parsed.values).length;
      return { valid: true, details: `Valid envx file with ${keyCount} encrypted values` };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { valid: false, details: message };
    }
  }
}
