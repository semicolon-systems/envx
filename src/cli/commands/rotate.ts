import { Envx } from '../../lib/envx';
import { logger } from '../../utils/logger';

export const rotateCommand = async (
  newKeyPath: string,
  oldKeyPath: string,
  envxPath: string,
): Promise<void> => {
  try {
    const envx = new Envx(oldKeyPath);
    await envx.rotateKey(envxPath, newKeyPath);

    console.log(`Key rotated successfully`);
    console.log(`New key: ${newKeyPath}`);
    console.log(`Updated file: ${envxPath}`);
    console.log(`\nNext steps:`);
    console.log(`1. Update deployment to use new key file`);
    console.log(`2. Securely delete old key file`);
    console.log(`3. Backup new key file`);

    logger.info('Key rotation completed', { newKey: newKeyPath, file: envxPath });
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Key rotation failed', { error: message });
    console.error(`Error: ${message}`);
    process.exit(1);
  }
};
