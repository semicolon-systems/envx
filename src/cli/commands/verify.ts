/**
 * CLI command: Verify .envx file structural integrity.
 * 
 * Validates:
 * - JSON format
 * - Required fields
 * - Schema compliance
 * - Nonce/value correspondence
 * 
 * Does NOT verify cryptographic authenticity (would require decryption).
 */

import { Envx } from '../../lib/envx';
import { existsSync } from 'fs';
import { createLogger } from '../../utils/logger';

const logger = createLogger('CLI.verify');

export const verifyCommand = async (file: string): Promise<void> => {
  try {
    if (!existsSync(file)) {
      console.error(`✗ Error: File not found: ${file}`);
      process.exit(1);
    }

    logger.info('verify', `Verifying ${file}`);
    
    const envx = new Envx();
    const { valid, details } = envx.verify(file);

    if (valid) {
      console.info(`✓ ${details}`);
      logger.info('verify', 'Verification passed');
      process.exit(0);
    } else {
      console.error(`✗ ${details}`);
      logger.error('verify', `Verification failed: ${details}`);
      process.exit(1);
    }
  } catch (error) {
    logger.error('verify', `Verification error: ${String(error)}`);
    
    if (error instanceof Error) {
      console.error(`✗ Error: ${error.message}`);
    } else {
      console.error(`✗ Error: ${String(error)}`);
    }
    
    process.exit(1);
  }
};
