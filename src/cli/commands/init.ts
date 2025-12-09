import { Envx } from '../../lib/envx';

export const initCommand = async (mode: string, keyPath: string): Promise<void> => {
  try {
    const envx = new Envx(keyPath);

    if (mode === 'password') {
      const password = 'default-test-password';
      const { salt, kdfMeta } = await envx.init('password', Buffer.from(password));
      console.info(`Key initialized at ${keyPath}`);
      console.info(`Salt: ${salt}`);
      console.info(`KDF: ${JSON.stringify(kdfMeta)}`);
    } else {
      const { keyPath: kp } = await envx.init('random');
      console.info(`Key initialized at ${kp}`);
    }
  } catch (error) {
    console.error(`Error: ${String(error)}`);
    process.exit(1);
  }
};
