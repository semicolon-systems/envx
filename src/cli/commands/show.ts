import { Envx } from '../../lib/envx';
import { logger } from '../../utils/logger';

export const showCommand = async (file: string, keyPath: string): Promise<void> => {
  try {
    const envx = new Envx(keyPath);
    const values = await envx.decrypt(file);
    console.log(JSON.stringify(values, null, 2));
    logger.info('Displayed decrypted values');
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Show command failed', { error: message });
    console.error(`Error: ${message}`);
    process.exit(1);
  }
};
