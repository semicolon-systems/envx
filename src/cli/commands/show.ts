import { Envx } from '../../lib/envx';
import { logger } from '../../utils/logger';
import { wipeRecord } from '../../utils/memory';

export const showCommand = async (file: string, keyPath: string): Promise<void> => {
  try {
    const envx = new Envx(keyPath);
    const values = await envx.decrypt(file);

    const buffers: Record<string, Buffer> = {};
    for (const [key, value] of Object.entries(values)) {
      buffers[key] = Buffer.from(value, 'utf8');
    }

    console.log(JSON.stringify(values, null, 2));

    wipeRecord(buffers);
    for (const key of Object.keys(values)) {
      delete values[key];
    }

    logger.info('Displayed decrypted values');
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Show command failed', { error: message });
    console.error(`Error: ${message}`);
    process.exit(1);
  }
};
