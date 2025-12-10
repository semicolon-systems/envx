/**
 * CLI command: Export decrypted variables as shell export statements.
 * 
 * Outputs in format: export KEY='value'
 * Values are properly escaped for shell safety.
 * 
 * Usage: eval "$(envx export-vars .envx)"
 * or: envx export-vars .envx >> $GITHUB_ENV
 */

import { Envx } from '../../lib/envx';
import { existsSync } from 'fs';
import { createLogger } from '../../utils/logger';

const logger = createLogger('CLI.export-vars');

export const exportVarsCommand = async (file: string, keyPath: string): Promise<void> => {
  try {
    if (!existsSync(file)) {
      console.error(`ERROR: Error: Encrypted file not found: ${file}`);
      process.exit(1);
    }

    logger.info('export-vars', `Exporting from ${file}`);
    
    const envx = new Envx(keyPath);
    const values = await envx.decrypt(file);
    
    for (const [key, value] of Object.entries(values)) {
      // Escape single quotes for shell safety: ' becomes '\\'\''
      const escaped = value.replace(/'/g, "'\\\\''" );
      console.info(`export ${key}='${escaped}'`);
    }
    
    logger.debug('export-vars', `Exported ${Object.keys(values).length} variables`);
  } catch (error) {
    logger.error('export-vars', `Export failed: ${String(error)}`);
    
    if (error instanceof Error) {
      console.error(`ERROR: Error: ${error.message}`);
    } else {
      console.error(`ERROR: Error: ${String(error)}`);
    }
    
    process.exit(1);
  }
};
