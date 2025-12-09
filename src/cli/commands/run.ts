import { spawn } from 'child_process';
import { Envx } from '../../lib/envx';

export const runCommand = async (cmdArgs: string[], keyPath: string, envxPath: string): Promise<void> => {
  try {
    const envx = new Envx(keyPath);
    const values = await envx.decrypt(envxPath);

    const env = { ...process.env, ...values };
    const cmd = cmdArgs[0];
    const args = cmdArgs.slice(1);

    const child = spawn(cmd, args, { env, stdio: 'inherit' });
    child.on('exit', (code: number | null) => {
      process.exit(code ?? 0);
    });
  } catch (error) {
    console.error(`Error: ${String(error)}`);
    process.exit(1);
  }
};
