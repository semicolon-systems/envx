import { writeFileSync } from 'fs';
import { randomBytes } from 'crypto';

export const rotateCommand = async (newKeyPath: string, _oldKeyPath: string, _envxPath: string): Promise<void> => {
  try {
    const newKey = randomBytes(32);
    writeFileSync(newKeyPath, newKey);

    // For now, we write the key plainly. In production, consider key rotation ceremonies.
    console.info(`Key rotated to ${newKeyPath}`);
    console.info(`Update your deployment with the new key`);
    console.info(`Re-encrypt secrets with new key manually`);
  } catch (error) {
    console.error(`Error: ${String(error)}`);
    process.exit(1);
  }
};
