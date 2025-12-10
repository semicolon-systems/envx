/**
 * CLI command: Decrypt .envx file to stdout.
 * 
 * Outputs plaintext KEY=VALUE pairs. Use with caution:
 * - Output may be logged by shell history
 * - Output may be captured by monitoring tools
 * - Prefer 'envx run' for production use
 */

import { Envx } from '../../lib/envx';
import { existsSync } from 'fs';
import { createLogger } from '../../utils/logger';

const logger = createLogger('CLI.decrypt');

export const decryptCommand = async (
  file: string, 
  keyPath: string, 
  _write: boolean
): Promise<void> => {
  try {
    if (!existsSync(file)) {
      console.error(`ERROR: Error: Encrypted file not found: ${file}`);
      process.exit(1);
    }

    logger.info('decrypt', `Decrypting ${file}`);
    
    const envx = new Envx(keyPath);
    const values = await envx.decrypt(file);
    
    // Output in .env format
    for (const [key, value] of Object.entries(values)) {
      console.info(`${key}=${value}`);
    }
    
    logger.info('decrypt', `Decrypted ${Object.keys(values).length} variables`);
  } catch (error) {
    logger.error('decrypt', `Decryption failed: ${String(error)}`);
    
    if (error instanceof Error) {
      console.error(`ERROR: Error: ${error.message}`);
    } else {
      console.error(`ERROR: Error: ${String(error)}`);
    }
    
    process.exit(1);
  }
};
