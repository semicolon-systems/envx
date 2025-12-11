import { Envx } from '../../lib/envx';
import { createInterface } from 'readline';
import type { Interface as ReadlineInterface } from 'readline';
import { stdin, stdout } from 'process';
import { logger } from '../../utils/logger';
import { wipeBuffer } from '../../utils/memory';

const promptPassword = async (prompt: string): Promise<string> => {
  const rl = createInterface({ input: stdin, output: stdout, terminal: true }) as ReadlineInterface & {
    _writeToOutput?: (s: string) => void;
  };

  // Hide user input by overriding _writeToOutput.
  const originalWrite = rl._writeToOutput;
  rl._writeToOutput = function (s: string) {
    // Only show a single asterisk for each character typed to avoid echoing secrets
    if (s && !s.includes('\u0004')) {
      // Write a placeholder char instead of the typed character
      return stdout.write('*');
    }
    if (originalWrite) return originalWrite.call(this, s);
    return undefined;
  };

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      // restore default behavior
      rl._writeToOutput = originalWrite;
      resolve(answer);
    });
  });
};

export const initCommand = async (mode: string, keyPath: string): Promise<void> => {
  try {
    const envx = new Envx(keyPath);

    if (mode === 'password') {
      const password = await promptPassword('Enter password for key derivation: ');
      const confirm = await promptPassword('Confirm password: ');

      if (password !== confirm) {
        logger.error('Passwords do not match');
        process.exit(1);
      }

      if (!password) {
        logger.error('Password cannot be empty');
        process.exit(1);
      }

      if (password.length < 12) {
        logger.error('Password must be at least 12 characters');
        process.exit(1);
      }

      const passwordBuf = Buffer.from(password, 'utf8');
      const { kdfMeta } = await envx.init('password', passwordBuf);
      // wipe password from memory after use
      wipeBuffer(passwordBuf);
      console.log(`Key initialized at ${keyPath}`);
      console.log(`KDF: ${kdfMeta?.type}`);

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
