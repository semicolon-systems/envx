import { Envx } from '../../lib/envx';
import { logger } from '../../utils/logger';

export const exportVarsCommand = async (file: string, keyPath: string): Promise<void> => {
  try {
    const envx = new Envx(keyPath);
    const values = await envx.decrypt(file);

    for (const [key, value] of Object.entries(values)) {
      const escaped = value.replace(/'/g, "'\\''");
      console.log(`export ${key}='${escaped}'`);
    }

    logger.info('Exported environment variables', { count: Object.keys(values).length });
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Export command failed', { error: message });
    console.error(`Error: ${message}`);
    process.exit(1);
  }
};
