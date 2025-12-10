import { Envx } from '../../lib/envx';
import { logger } from '../../utils/logger';

export const encryptCommand = async (
  file: string,
  output: string | undefined,
  keyPath: string,
): Promise<void> => {
  try {
    const envx = new Envx(keyPath);
    const result = await envx.encrypt(file, output);
    const outputPath = output || file.replace(/\.env$/, '.envx');

    console.log(`Encrypted ${Object.keys(result.values).length} values to ${outputPath}`);
    logger.info('Encryption completed successfully');

    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Encryption failed', { error: message });
    console.error(`Error: ${message}`);
    process.exit(1);
  }
};
