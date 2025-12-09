import { readFileSync, writeFileSync, existsSync } from 'fs';
import { randomBytes } from 'crypto';
import { deriveKey } from '../crypto/kdf';
import type { KdfMeta } from '../crypto/kdf';
import { encryptValues } from '../crypto/encrypt';
import { decryptValues } from '../crypto/decrypt';
import { buildEnvxFile, parseEnvx } from '../format/envx-format';
import type { EnvxFile } from '../format/envx-format';
import { MissingKeyError } from '../utils/errors';
import { wipeBuffer } from '../utils/memory';

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
      throw new Error(`Key file already exists at ${this.keyPath}`);
    }

    if (mode === 'random') {
      const key = randomBytes(32);
      writeFileSync(this.keyPath, key);
      return { keyPath: this.keyPath };
    }

    if (!password) {
      throw new Error('Password required for password-based key derivation');
    }

    const { key, salt, meta: kdfMeta } = await deriveKey(password, 'argon2id');
    writeFileSync(this.keyPath, key);
    wipeBuffer(key);
    return { keyPath: this.keyPath, salt: salt.toString('base64'), kdfMeta };
  }

  async encrypt(envFile: string, outputPath?: string): Promise<EnvxFile> {
    const envContent = readFileSync(envFile, 'utf8');
    const plaintext: Record<string, string> = {};
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.substring(0, eqIndex).trim();
      const value = trimmed.substring(eqIndex + 1).trim();
      plaintext[key] = value;
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

    const path = outputPath ?? envFile.replace(/\.env/, '.envx');
    writeFileSync(path, JSON.stringify(envxFile, null, 2));
    return envxFile;
  }

  async decrypt(envxFile: string): Promise<Record<string, string>> {
    const json = readFileSync(envxFile, 'utf8');
    const parsed = parseEnvx(json);
    const key = this.loadKey();
    const plaintext = await decryptValues(parsed.values, parsed.nonce_map, key);
    wipeBuffer(key);
    return plaintext;
  }

  private loadKey(): Buffer {
    if (!existsSync(this.keyPath)) {
      throw new MissingKeyError(`Key file not found at ${this.keyPath}`);
    }
    return readFileSync(this.keyPath);
  }

  rotateKey(newKeyPath: string): void {
    if (existsSync(newKeyPath)) {
      throw new Error(`New key path already exists: ${newKeyPath}`);
    }
    const newKey = randomBytes(32);
    writeFileSync(newKeyPath, newKey);
    this.keyPath = newKeyPath;
  }

  verify(envxPath: string): { valid: boolean; details: string } {
    try {
      const json = readFileSync(envxPath, 'utf8');
      parseEnvx(json);
      return { valid: true, details: 'Valid envx file' };
    } catch (error) {
      return { valid: false, details: String(error) };
    }
  }
}
