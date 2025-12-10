import { Envx } from '../../lib/envx';
import { writeFileSync } from 'fs';
import { logger } from '../../utils/logger';

export const decryptCommand = async (
  file: string,
  keyPath: string,
  write: boolean,
): Promise<void> => {
  try {
    const envx = new Envx(keyPath);
    const values = await envx.decrypt(file);

    if (write) {
      const output = file.replace(/\.envx$/, '.env');
      const lines = Object.entries(values).map(([k, v]) => `${k}=${v}`);
      writeFileSync(output, lines.join('\n'), { mode: 0o600 });
      console.log(`Decrypted to ${output}`);
      logger.warn('Plaintext written to disk', { path: output });
    } else {
      for (const [key, value] of Object.entries(values)) {
        console.log(`${key}=${value}`);
      }
    }

    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Decryption failed', { error: message });
    console.error(`Error: ${message}`);
    process.exit(1);
  }
};
