/**
 * Main library class for envx encrypted environment variable management.
 * 
 * This class provides the core API for:
 * - Initializing encryption keys (random or password-derived)
 * - Encrypting .env files to .envx format
 * - Decrypting .envx files back to environment variables
 * - Verifying .envx file integrity
 * 
 * Security considerations:
 * - Keys are never logged or exposed in error messages
 * - Sensitive buffers are wiped after use
 * - All encryption uses AES-256-GCM with unique random nonces
 * - Password-derived keys use Argon2id (memory-hard KDF)
 */

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
import { createLogger } from '../utils/logger';

const logger = createLogger('Envx');

export class Envx {
  private keyPath: string;

  constructor(keyPath: string = '.envx.key') {
    this.keyPath = keyPath;
  }

  /**
   * Initialize a new encryption key.
   * 
   * @param mode - 'random' for cryptographically random key, 'password' for KDF-derived key
   * @param password - Required for password mode; must be non-empty Buffer
   * @returns Key path and KDF metadata (if password mode)
   * @throws Error if key file already exists or password is missing/empty
   */
  async init(
    mode: 'random' | 'password',
    password?: Buffer,
  ): Promise<{ keyPath: string; salt?: string; kdfMeta?: KdfMeta }> {
    if (existsSync(this.keyPath)) {
      logger.error('init_failed', `Key file already exists: ${this.keyPath}`);
      throw new Error(`Key file already exists at ${this.keyPath}`);
    }

    if (mode === 'random') {
      // Generate cryptographically secure random 256-bit key
      const key = randomBytes(32);
      writeFileSync(this.keyPath, key, { mode: 0o600 }); // Restrict to owner-only
      logger.info('init_success', `Random key generated: ${this.keyPath}`);
      return { keyPath: this.keyPath };
    }

    if (!password || password.length === 0) {
      throw new Error('Password required for password-based key derivation');
    }

    // Derive key using Argon2id (memory-hard, GPU-resistant)
    const { key, salt, meta: kdfMeta } = await deriveKey(password, 'argon2id');
    writeFileSync(this.keyPath, key, { mode: 0o600 });
    wipeBuffer(key); // Zero out key from memory
    logger.info('init_success', `Password-derived key created: ${this.keyPath}`);
    return { keyPath: this.keyPath, salt: salt.toString('base64'), kdfMeta };
  }

  /**
   * Encrypt a .env file to .envx format.
   * 
   * Parses KEY=VALUE pairs from plaintext .env file and encrypts each value
   * individually with AES-256-GCM. Each value gets a unique random nonce.
   * 
   * @param envFile - Path to plaintext .env file
   * @param outputPath - Optional output path (defaults to .envx extension)
   * @returns The encrypted EnvxFile structure
   * @throws Error if env file doesn't exist or key file is missing
   */
  async encrypt(envFile: string, outputPath?: string): Promise<EnvxFile> {
    if (!existsSync(envFile)) {
      throw new Error(`Environment file not found: ${envFile}`);
    }

    const envContent = readFileSync(envFile, 'utf8');
    const plaintext = this.parseEnvFile(envContent);
    
    if (Object.keys(plaintext).length === 0) {
      logger.warn('encrypt_empty', `No environment variables found in ${envFile}`);
    }

    const key = this.loadKey();
    const { nonceMap, values } = await encryptValues(plaintext, key);
    wipeBuffer(key);

    // Build encrypted file structure with no KDF metadata
    // (KDF is only used during key initialization, not encryption)
    const envxFile = buildEnvxFile({
      kdf: { type: 'none' },
      nonce_map: nonceMap,
      values,
      meta: { created_at: new Date().toISOString() },
    });

    const path = outputPath ?? envFile.replace(/\.env$/, '.envx');
    writeFileSync(path, JSON.stringify(envxFile, null, 2), { mode: 0o600 });
    
    logger.info('encrypt_success', `Encrypted ${Object.keys(values).length} variables to ${path}`);
    return envxFile;
  }

  /**
   * Decrypt an .envx file to environment variables.
   * 
   * @param envxFile - Path to encrypted .envx file
   * @returns Object mapping variable names to decrypted values
   * @throws ValidationError if file format is invalid
   * @throws DecryptionError if MAC verification fails
   * @throws MissingKeyError if key file doesn't exist
   */
  async decrypt(envxFile: string): Promise<Record<string, string>> {
    if (!existsSync(envxFile)) {
      throw new Error(`Encrypted file not found: ${envxFile}`);
    }

    const json = readFileSync(envxFile, 'utf8');
    const parsed = parseEnvx(json);
    
    const key = this.loadKey();
    const plaintext = await decryptValues(parsed.values, parsed.nonce_map, key);
    wipeBuffer(key);
    
    logger.info('decrypt_success', `Decrypted ${Object.keys(plaintext).length} variables from ${envxFile}`);
    return plaintext;
  }

  /**
   * Verify the structural integrity of an .envx file.
   * 
   * Validates JSON schema, required fields, and format correctness.
   * Does NOT verify cryptographic authenticity (requires decryption).
   * 
   * @param envxPath - Path to .envx file
   * @returns Object with validity status and details
   */
  verify(envxPath: string): { valid: boolean; details: string } {
    try {
      if (!existsSync(envxPath)) {
        return { valid: false, details: `File not found: ${envxPath}` };
      }

      const json = readFileSync(envxPath, 'utf8');
      const parsed = parseEnvx(json);
      
      // Additional sanity checks
      const varCount = Object.keys(parsed.values).length;
      const nonceCount = Object.keys(parsed.nonce_map).length;
      
      if (varCount !== nonceCount) {
        return { 
          valid: false, 
          details: `Mismatch: ${varCount} values but ${nonceCount} nonces` 
        };
      }

      logger.info('verify_success', `Valid .envx file: ${varCount} variables`);
      return { valid: true, details: `Valid envx file with ${varCount} variables` };
    } catch (error) {
      logger.error('verify_failed', String(error));
      return { valid: false, details: String(error) };
    }
  }

  /**
   * Load the encryption key from disk.
   * 
   * @returns 32-byte encryption key
   * @throws MissingKeyError if key file doesn't exist
   * @throws Error if key file has wrong size
   */
  private loadKey(): Buffer {
    if (!existsSync(this.keyPath)) {
      throw new MissingKeyError(`Key file not found: ${this.keyPath}`);
    }

    const key = readFileSync(this.keyPath);
    
    // Validate key length (must be exactly 256 bits for AES-256)
    if (key.length !== 32) {
      throw new Error(`Invalid key file: expected 32 bytes, got ${key.length} bytes`);
    }

    return key;
  }

  /**
   * Parse .env file content into key-value pairs.
   * 
   * Handles:
   * - Comments (lines starting with #)
   * - Empty lines
   * - Quoted values
   * - Values with = signs in them
   * 
   * @param content - Raw .env file content
   * @returns Object mapping variable names to values
   */
  private parseEnvFile(content: string): Record<string, string> {
    const result: Record<string, string> = {};
    
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue; // Skip malformed lines
      
      const key = trimmed.substring(0, eqIndex).trim();
      let value = trimmed.substring(eqIndex + 1).trim();
      
      // Handle quoted values (remove surrounding quotes)
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      if (key) {
        result[key] = value;
      }
    }
    
    return result;
  }
}
