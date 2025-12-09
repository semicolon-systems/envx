import { Envx } from '../../lib/envx';

export const showCommand = async (file: string, keyPath: string): Promise<void> => {
  try {
    const envx = new Envx(keyPath);
    const values = await envx.decrypt(file);
    console.info(JSON.stringify(values, null, 2));
  } catch (error) {
    console.error(`Error: ${String(error)}`);
    process.exit(1);
  }
};
