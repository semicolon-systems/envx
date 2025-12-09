import { readFileSync } from 'fs';
import Ajv from 'ajv';

export const checkCommand = async (file: string, schemaPath: string | undefined): Promise<void> => {
  try {
    const envxContent = readFileSync(file, 'utf8');
    const data = JSON.parse(envxContent);

    if (!schemaPath) {
      console.warn('No schema provided, skipping validation');
      return;
    }

    const schemaContent = readFileSync(schemaPath, 'utf8');
    const schema = JSON.parse(schemaContent);

    const ajv = new Ajv();
    const validate = ajv.compile(schema as Record<string, unknown>);

    if (validate(data)) {
      console.info('✓ Validation passed');
    } else {
      console.error('✗ Validation failed');
      if (validate.errors) {
        for (const error of validate.errors) {
          console.error(`  ${error.instancePath} ${error.message}`);
        }
      }
      process.exit(1);
    }
  } catch (error) {
    console.error(`Error: ${String(error)}`);
    process.exit(1);
  }
};
