export { Envx } from './lib/envx';
export type { EnvxFile } from './format/envx-format';
export { parseEnvx, buildEnvxFile } from './format/envx-format';
export { deriveKey, deriveKeyArgon2id, deriveKeyScrypt } from './crypto/kdf';
export { encryptValues } from './crypto/encrypt';
export { decryptValues } from './crypto/decrypt';
export { EnvxError, ValidationError, DecryptionError, KdfError, FileExistsError, MissingKeyError } from './utils/errors';
export { log, logger } from './logging/logger';