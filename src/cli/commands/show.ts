/**
 * CLI command: Show decrypted values as JSON.
 * 
 * Outputs variables in JSON format for programmatic use.
 * Safer than 'decrypt' for piping to other tools.
 */

import { Envx } from '../../lib/envx';
import { existsSync } from 'fs';
import { createLogger } from '../../utils/logger';

const logger = createLogger('CLI.show');

export const showCommand = async (file: string, keyPath: string): Promise<void> => {
  try {
    if (!existsSync(file)) {
      console.error(`✗ Error: Encrypted file not found: ${file}`);
      process.exit(1);
    }

    logger.info('show', `Displaying ${file}`);
    
    const envx = new Envx(keyPath);
    const values = await envx.decrypt(file);
    
    console.info(JSON.stringify(values, null, 2));
    
    logger.debug('show', `Displayed ${Object.keys(values).length} variables`);
  } catch (error) {
    logger.error('show', `Show failed: ${String(error)}`);
    
    if (error instanceof Error) {
      console.error(`✗ Error: ${error.message}`);
    } else {
      console.error(`✗ Error: ${String(error)}`);
    }
    
    process.exit(1);
  }
};
