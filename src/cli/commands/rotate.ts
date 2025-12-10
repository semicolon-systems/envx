import { readFileSync, writeFileSync } from 'fs';
import { Envx } from '../../lib/envx';
import { encryptValues } from '../../crypto/encrypt';
import { buildEnvxFile } from '../../format/envx-format';
import { wipeBuffer } from '../../utils/memory';

/**
 * Rotate encryption key by decrypting with old key and re-encrypting with new key
 * @param newKeyPath - Path to the new encryption key file
 * @param oldKeyPath - Path to the current encryption key file
 * @param envxPath - Path to the .envx file to rotate
 */
export const rotateCommand = async (newKeyPath: string, oldKeyPath: string, envxPath: string): Promise<void> => {
  try {
    // Step 1: Read the new key (should already exist from init command)
    const newKey = readFileSync(newKeyPath);
    
    // Step 2: Decrypt with old key
    const oldEnvx = new Envx(oldKeyPath);
    const values = await oldEnvx.decrypt(envxPath);
    
    console.info(`Decrypted ${Object.keys(values).length} values with old key`);
    
    // Step 3: Re-encrypt with new key
    const { nonceMap, values: encryptedValues } = await encryptValues(values, newKey);
    wipeBuffer(newKey);
    
    const envxFile = buildEnvxFile({
      kdf: { type: 'none' },
      nonce_map: nonceMap,
      values: encryptedValues,
      meta: { 
        created_at: new Date().toISOString(),
        rotated_at: new Date().toISOString()
      },
    });
    
    writeFileSync(envxPath, JSON.stringify(envxFile, null, 2));
    
    console.info(`✓ Key rotated successfully`);
    console.info(`✓ Secrets re-encrypted with new key: ${newKeyPath}`);
    console.info(`✓ Updated .envx file: ${envxPath}`);
    console.info(`\nNext steps:`);
    console.info(`1. Update deployment environment with new key`);
    console.info(`2. Securely delete old key: ${oldKeyPath}`);
    console.info(`3. Test decryption with new key`);
  } catch (error) {
    console.error(`Error rotating key: ${String(error)}`);
    process.exit(1);
  }
};
