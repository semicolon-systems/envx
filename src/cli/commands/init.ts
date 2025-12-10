import { Envx } from '../../lib/envx';
import { createInterface } from 'readline';
import { stdin, stdout } from 'process';
import { logger } from '../../utils/logger';

const promptPassword = async (prompt: string): Promise<string> => {
  const rl = createInterface({ input: stdin, output: stdout });

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
};

export const initCommand = async (mode: string, keyPath: string): Promise<void> => {
  try {
    const envx = new Envx(keyPath);

    if (mode === 'password') {
      const password = await promptPassword('Enter password for key derivation: ');

      if (!password) {
        logger.error('Password cannot be empty');
        process.exit(1);
      }

      if (password.length < 12) {
        logger.error('Password must be at least 12 characters');
        process.exit(1);
      }

      const { salt, kdfMeta } = await envx.init('password', Buffer.from(password, 'utf8'));
      console.log(`Key initialized at ${keyPath}`);
      console.log(`KDF: ${kdfMeta?.type}`);
      console.log(`Salt: ${salt}`);

      logger.info('Password-based key initialized successfully');
    } else if (mode === 'random') {
      const { keyPath: kp } = await envx.init('random');
      console.log(`Key initialized at ${kp}`);
      logger.info('Random key initialized successfully');
    } else {
      logger.error('Invalid mode. Use "random" or "password"');
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Initialization failed', { error: message });
    console.error(`Error: ${message}`);
    process.exit(1);
  }
};
