/**
 * CLI command: Rotate encryption key.
 * 
 * Process:
 * 1. Decrypt with old key
 * 2. Generate new key
 * 3. Re-encrypt with new key
 * 4. Clean up temporary files
 * 
 * Security notes:
 * - Temporary plaintext file is created briefly
 * - Temp file is deleted immediately after re-encryption
 * - Old key should be securely deleted after rotation
 */

import { writeFileSync, unlinkSync, existsSync } from 'fs';
import { randomBytes } from 'crypto';
import { Envx } from '../../lib/envx';
import { createLogger } from '../../utils/logger';

const logger = createLogger('CLI.rotate');

export const rotateCommand = async (
  newKeyPath: string, 
  oldKeyPath: string, 
  envxPath: string
): Promise<void> => {
  const tempEnvFile = `.env.tmp.${Date.now()}.rotate`;
  
  try {
    // Validate inputs
    if (!existsSync(oldKeyPath)) {
      console.error(`✗ Error: Old key file not found: ${oldKeyPath}`);
      process.exit(1);
    }

    if (!existsSync(envxPath)) {
      console.error(`✗ Error: Encrypted file not found: ${envxPath}`);
      process.exit(1);
    }

    if (existsSync(newKeyPath)) {
      console.error(`✗ Error: New key file already exists: ${newKeyPath}`);
      process.exit(1);
    }

    logger.info('rotate', `Rotating key from ${oldKeyPath} to ${newKeyPath}`);
    
    // Step 1: Decrypt with old key
    console.info('Step 1/4: Decrypting with old key...');
    const oldEnvx = new Envx(oldKeyPath);
    const plaintext = await oldEnvx.decrypt(envxPath);
    
    // Step 2: Write temporary plaintext file
    console.info('Step 2/4: Creating temporary file...');
    const envContent = Object.entries(plaintext)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    writeFileSync(tempEnvFile, envContent, { mode: 0o600 });
    
    // Step 3: Generate new key
    console.info('Step 3/4: Generating new key...');
    const newKey = randomBytes(32);
    writeFileSync(newKeyPath, newKey, { mode: 0o600 });
    logger.info('rotate', `New key generated: ${newKeyPath}`);
    
    // Step 4: Re-encrypt with new key
    console.info('Step 4/4: Re-encrypting with new key...');
    const newEnvx = new Envx(newKeyPath);
    await newEnvx.encrypt(tempEnvFile, envxPath);
    
    // Clean up temporary file
    unlinkSync(tempEnvFile);
    
    console.info('\n✓ Key rotation complete');
    console.info(`  New key: ${newKeyPath}`);
    console.info(`  Updated: ${envxPath}`);
    console.info('\n⚠️  Next steps:');
    console.info('  1. Update your deployment/CI with the new key');
    console.info('  2. Verify decryption works: envx verify ${envxPath}');
    console.info('  3. Securely delete the old key: shred -u ${oldKeyPath}');
    
    logger.info('rotate', 'Key rotation successful');
  } catch (error) {
    // Clean up temp file on error
    try {
      if (existsSync(tempEnvFile)) {
        unlinkSync(tempEnvFile);
      }
    } catch (cleanupError) {
      logger.warn('rotate', `Failed to cleanup temp file: ${String(cleanupError)}`);
    }
    
    logger.error('rotate', `Rotation failed: ${String(error)}`);
    
    if (error instanceof Error) {
      console.error(`\n✗ Error: ${error.message}`);
    } else {
      console.error(`\n✗ Error: ${String(error)}`);
    }
    
    process.exit(1);
  }
};
