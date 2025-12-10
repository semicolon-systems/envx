/**
 * CLI command: Run command with decrypted environment variables.
 * 
 * Decrypts variables and injects them into the child process environment.
 * The child process inherits stdio, so it behaves like a direct execution.
 * 
 * Security:
 * - Variables only exist in child process memory
 * - Never written to disk
 * - Cleaned up when child exits
 */

import { spawn } from 'child_process';
import { Envx } from '../../lib/envx';
import { existsSync } from 'fs';
import { createLogger } from '../../utils/logger';

const logger = createLogger('CLI.run');

export const runCommand = async (
  cmdArgs: string[], 
  keyPath: string, 
  envxPath: string
): Promise<void> => {
  try {
    if (cmdArgs.length === 0) {
      console.error('ERROR: Error: No command specified');
      process.exit(1);
    }

    if (!existsSync(envxPath)) {
      console.error(`ERROR: Error: Encrypted file not found: ${envxPath}`);
      process.exit(1);
    }

    logger.info('run', `Decrypting environment for command: ${cmdArgs[0]}`);
    
    const envx = new Envx(keyPath);
    const values = await envx.decrypt(envxPath);

    // Merge decrypted vars with existing environment
    // Decrypted vars take precedence
    const env = { ...process.env, ...values };
    const cmd = cmdArgs[0];
    const args = cmdArgs.slice(1);

    logger.debug('run', `Spawning: ${cmd} with ${Object.keys(values).length} environment variables`);

    const child = spawn(cmd, args, { 
      env, 
      stdio: 'inherit' // Pass through stdin/stdout/stderr
    });
    
    child.on('error', (err) => {
      logger.error('run', `Failed to spawn command: ${err.message}`);
      console.error(`ERROR: Error: Failed to execute '${cmd}': ${err.message}`);
      process.exit(1);
    });

    child.on('exit', (code: number | null, signal: string | null) => {
      if (signal) {
        logger.warn('run', `Child process killed by signal: ${signal}`);
        process.exit(128 + (signal === 'SIGTERM' ? 15 : 1));
      }
      
      logger.debug('run', `Child process exited with code ${code}`);
      process.exit(code ?? 0);
    });
  } catch (error) {
    logger.error('run', `Run command failed: ${String(error)}`);
    
    if (error instanceof Error) {
      console.error(`ERROR: Error: ${error.message}`);
    } else {
      console.error(`ERROR: Error: ${String(error)}`);
    }
    
    process.exit(1);
  }
};
