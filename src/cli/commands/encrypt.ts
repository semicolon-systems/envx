/**
 * CLI command: Encrypt .env file to .envx format.
 * 
 * Reads plaintext environment variables and encrypts each value
 * with AES-256-GCM. Output file is created with restrictive permissions.
 */

import { Envx } from '../../lib/envx';
import { existsSync } from 'fs';
import { createLogger } from '../../utils/logger';

const logger = createLogger('CLI.encrypt');

export const encryptCommand = async (
  file: string, 
  output: string | undefined, 
  keyPath: string
): Promise<void> => {
  try {
    if (!existsSync(file)) {
      console.error(`✗ Error: Input file not found: ${file}`);
      process.exit(1);
    }

    logger.info('encrypt', `Encrypting ${file}`);
    
    const envx = new Envx(keyPath);
    const result = await envx.encrypt(file, output);
    
    const outputPath = output || file.replace(/\.env$/, '.envx');
    const varCount = Object.keys(result.values).length;
    
    console.info(`✓ Encrypted ${varCount} variable${varCount !== 1 ? 's' : ''} to ${outputPath}`);
    logger.info('encrypt', `Encryption successful: ${varCount} variables`);
  } catch (error) {
    logger.error('encrypt', `Encryption failed: ${String(error)}`);
    
    if (error instanceof Error) {
      console.error(`✗ Error: ${error.message}`);
    } else {
      console.error(`✗ Error: ${String(error)}`);
    }
    
    process.exit(1);
  }
};
