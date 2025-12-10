import { spawn } from 'child_process';
import { Envx } from '../../lib/envx';
import { logger } from '../../utils/logger';

export const runCommand = async (
  cmdArgs: string[],
  keyPath: string,
  envxPath: string,
): Promise<void> => {
  try {
    if (cmdArgs.length === 0) {
      console.error('Error: No command specified');
      process.exit(1);
    }

    const envx = new Envx(keyPath);
    const values = await envx.decrypt(envxPath);

    const env = { ...process.env, ...values };
    const cmd = cmdArgs[0];
    const args = cmdArgs.slice(1);

    logger.info('Executing command with decrypted environment', { command: cmd });

    const child = spawn(cmd, args, { env, stdio: 'inherit' });

    child.on('error', (err) => {
      logger.error('Command execution failed', { error: err.message });
      console.error(`Error: ${err.message}`);
      process.exit(1);
    });

    child.on('exit', (code: number | null) => {
      process.exit(code ?? 0);
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Run command failed', { error: message });
    console.error(`Error: ${message}`);
    process.exit(1);
  }
};
