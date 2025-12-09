import { Envx } from '../../lib/envx';

export const verifyCommand = async (file: string): Promise<void> => {
  try {
    const envx = new Envx();
    const { valid, details } = envx.verify(file);
    if (valid) {
      console.info(`✓ ${details}`);
    } else {
      console.error(`✗ ${details}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${String(error)}`);
    process.exit(1);
  }
};
