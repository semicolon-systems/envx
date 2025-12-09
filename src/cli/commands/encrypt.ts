import { Envx } from '../../lib/envx';

export const encryptCommand = async (file: string, output: string | undefined, keyPath: string): Promise<void> => {
  try {
    const envx = new Envx(keyPath);
    const result = await envx.encrypt(file, output);
    console.info(`Encrypted to ${output || file.replace(/\.env/, '.envx')}`);
    console.info(`Values encrypted: ${Object.keys(result.values).length}`);
  } catch (error) {
    console.error(`Error: ${String(error)}`);
    process.exit(1);
  }
};
