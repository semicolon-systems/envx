import { Envx } from '../../lib/envx';

export const decryptCommand = async (file: string, keyPath: string, _write: boolean): Promise<void> => {
  try {
    const envx = new Envx(keyPath);
    const values = await envx.decrypt(file);
    for (const [key, value] of Object.entries(values)) {
      console.info(`${key}=${value}`);
    }
  } catch (error) {
    console.error(`Error: ${String(error)}`);
    process.exit(1);
  }
};
