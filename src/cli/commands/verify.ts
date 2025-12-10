import { Envx } from '../../lib/envx';
import { logger } from '../../utils/logger';

export const verifyCommand = async (file: string): Promise<void> => {
  try {
    const envx = new Envx();
    const { valid, details } = envx.verify(file);

    if (valid) {
      console.log(`Valid: ${details}`);
      logger.info('Verification passed', { file });
      process.exit(0);
    } else {
      console.error(`Invalid: ${details}`);
      logger.error('Verification failed', { file, reason: details });
      process.exit(1);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Verify command failed', { error: message });
    console.error(`Error: ${message}`);
    process.exit(1);
  }
};
