import { Envx } from '../../lib/envx';

export const exportVarsCommand = async (file: string, keyPath: string): Promise<void> => {
  try {
    const envx = new Envx(keyPath);
    const values = await envx.decrypt(file);
    for (const [key, value] of Object.entries(values)) {
      // Shell-safe export: escape single quotes
      const escaped = value.replace(/'/g, "'\\''");
      console.info(`export ${key}='${escaped}'`);
    }
  } catch (error) {
    console.error(`Error: ${String(error)}`);
    process.exit(1);
  }
};
