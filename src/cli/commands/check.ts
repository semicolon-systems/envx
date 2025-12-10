import { readFileSync, existsSync } from 'fs';
import Ajv from 'ajv';
import { logger } from '../../utils/logger';
import { parseEnvx } from '../../format/envx-format';

export const checkCommand = async (file: string, schemaPath: string | undefined): Promise<void> => {
  try {
    if (!existsSync(file)) {
      console.error(`Error: File not found: ${file}`);
      process.exit(1);
    }

    const envxContent = readFileSync(file, 'utf8');

    if (!schemaPath) {
      parseEnvx(envxContent);
      console.log('Valid envx format');
      logger.info('Format validation passed');
      process.exit(0);
      return;
    }

    if (!existsSync(schemaPath)) {
      console.error(`Error: Schema file not found: ${schemaPath}`);
      process.exit(1);
    }

    const data = JSON.parse(envxContent);
    const schemaContent = readFileSync(schemaPath, 'utf8');
    const schema = JSON.parse(schemaContent);

    const ajv = new Ajv({ allErrors: true });
    const validate = ajv.compile(schema as Record<string, unknown>);

    if (validate(data)) {
      console.log('Validation passed');
      logger.info('Schema validation passed');
      process.exit(0);
    } else {
      console.error('Validation failed:');
      if (validate.errors) {
        for (const error of validate.errors) {
          console.error(`  ${error.instancePath} ${error.message}`);
        }
      }
      logger.error('Schema validation failed');
      process.exit(1);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('Check command failed');
    console.error(`Error: ${message}`);
    process.exit(1);
  }
};
