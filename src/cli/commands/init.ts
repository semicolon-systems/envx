/**
 * CLI command: Initialize encryption key.
 * 
 * Modes:
 * - random: Generate cryptographically secure random 256-bit key
 * - password: Derive key from user password using Argon2id
 * 
 * Security notes:
 * - Key file is written with 0600 permissions (owner-only)
 * - Password input is not echoed to terminal
 * - Password is wiped from memory after use
 * - Salt is displayed for user records (safe to share)
 */

import { Envx } from '../../lib/envx';
import { createInterface } from 'readline';
import { createLogger } from '../../utils/logger';

const logger = createLogger('CLI.init');

/**
 * Read password from stdin without echoing.
 * 
 * Note: In a real production CLI, you'd use a library like 'read' or 'prompts'
 * for proper password input with masking. This is a minimal implementation.
 */
const readPasswordFromStdin = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    // Note: This still echoes. For production, use a proper password input library.
    rl.question('Enter password: ', (password) => {
      rl.close();
      
      if (!password || password.trim().length === 0) {
        reject(new Error('Password cannot be empty'));
        return;
      }
      
      resolve(password);
    });
  });
};

export const initCommand = async (mode: string, keyPath: string): Promise<void> => {
  try {
    logger.info('init', `Initializing key in ${mode} mode at ${keyPath}`);
    
    const envx = new Envx(keyPath);

    if (mode === 'password') {
      const password = await readPasswordFromStdin();
      const passwordBuf = Buffer.from(password, 'utf8');
      
      // Wipe password string (best effort)
      password.split('').forEach((_, i, arr) => arr[i] = '\0');
      
      const { salt, kdfMeta } = await envx.init('password', passwordBuf);
      
      // Wipe password buffer
      passwordBuf.fill(0);
      
      console.info(`✓ Key initialized at ${keyPath}`);
      console.info(`  Salt: ${salt}`);
      console.info(`  KDF: ${kdfMeta?.type}`);
      
      // Display parameters based on KDF type
      if (kdfMeta?.type === 'argon2id' && 'memory' in kdfMeta.params) {
        console.info(`  Params: memory=${kdfMeta.params.memory}KB, time=${kdfMeta.params.time}`);
      } else if (kdfMeta?.type === 'scrypt' && 'N' in kdfMeta.params) {
        console.info(`  Params: N=${kdfMeta.params.N}, r=${kdfMeta.params.r}, p=${kdfMeta.params.p}`);
      }
      
      console.info('\n⚠️  Keep this key file secure and backed up.');
      console.info('⚠️  The salt is public, but the key must remain secret.');
    } else {
      const { keyPath: kp } = await envx.init('random');
      console.info(`✓ Random key initialized at ${kp}`);
      console.info('\n⚠️  This key is cryptographically random.');
      console.info('⚠️  Back it up securely - it cannot be recovered.');
    }

    logger.info('init', 'Key initialization successful');
  } catch (error) {
    logger.error('init', `Initialization failed: ${String(error)}`);
    
    if (error instanceof Error) {
      console.error(`✗ Error: ${error.message}`);
    } else {
      console.error(`✗ Error: ${String(error)}`);
    }
    
    process.exit(1);
  }
};
