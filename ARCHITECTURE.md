# envx Architecture

## Overview

envx is a production-grade encrypted environment variable manager using AES-256-GCM authenticated encryption with Argon2id key derivation. The codebase follows a modular, domain-driven architecture with clear separation of concerns.

## Module Structure

### Core Modules

#### `src/crypto/`

Cryptographic operations for encryption and key derivation.

- **`encrypt.ts`**: AES-256-GCM encryption
  - Function: `encryptValues()` encrypts plaintext values with unique random nonces
  - Each value receives its own 12-byte nonce to prevent nonce reuse attacks
  - Returns base64-encoded ciphertext with authentication tag

- **`decrypt.ts`**: AES-256-GCM decryption
  - Function: `decryptValues()` decrypts encrypted values
  - Verifies authentication tags to detect tampering
  - Securely wipes buffers after decryption

- **`kdf.ts`**: Key derivation functions
  - Functions: `deriveKeyArgon2id()`, `deriveKeyScrypt()`, `deriveKey()`
  - Argon2id: 64MB memory, 3 iterations, resistant to GPU and side-channel attacks
  - scrypt: N=2^15, r=8, p=1 (fallback)

-- **`utils/memory.ts`**: Secure memory operations
  - Functions: `wipeBuffer()`, `wipeBuffers()`, `wipeRecord()` used to clear sensitive buffers and reduce exposure

#### `src/lib/`

Core library providing the main API.

- **`envx.ts`**: Main Envx class
  - `init()`: Initialize new encryption key (random or password-based)
  - `encrypt()`: Encrypt .env file to .envx format
  - `decrypt()`: Decrypt .envx file to plaintext
  - `rotateKey()`: Rotate to new encryption key
  - `verify()`: Verify envx file integrity

#### `src/format/`

Format handling and validation.

- **`envx-format.ts`**: .envx file format
  - `parseEnvx()`: Parse and validate JSON
  - `validateEnvx()`: Strict schema validation
  - `buildEnvxFile()`: Create envx file structure
  - Enforces: version 1, AES-256-GCM cipher, matching nonces and values

#### `src/utils/`

Utility functions.

- **`errors.ts`**: Custom error types
  - `EnvxError`: Base error class
  - `ValidationError`, `DecryptionError`, `KdfError`, etc.
  - All errors include context for debugging

- **`logger.ts`**: Structured logging
  - Logs only non-sensitive information
  - Removes file paths, counts, and operational details from logs

- **`memory.ts`**: Secure memory operations
  - `wipeBuffer()`: Fill buffers with zeros
  - `wipeRecord()`: Wipe multiple buffers

#### `src/cli/`

Command-line interface using Commander.js.

- **`index.ts`**: CLI setup and command registration
- **`commands/`**: Individual command handlers
  - `init.ts`: Initialize encryption key
  - `encrypt.ts`: Encrypt .env file
  - `decrypt.ts`: Decrypt .envx file
  - `show.ts`: Display decrypted values
  - `run.ts`: Execute command with decrypted environment
  - `rotate.ts`: Rotate encryption key
  - `verify.ts`: Verify file integrity
  - `check.ts`: Validate against schema
  - `export-vars.ts`: Export as shell variables

#### `src/types/`

TypeScript type definitions.

- **`index.ts`**: All custom types
  - `Argon2idParams`, `ScryptParams`: KDF parameters
  - Exported from crypto modules

#### `src/config/`

Configuration validation.

- **`validator.ts`**: Schema validation
- **`schema.json`**: JSON Schema for envx format

## Cryptographic Specifications

### Encryption

- **Algorithm**: AES-256-GCM
- **Key Size**: 256 bits (32 bytes)
- **Nonce**: 96 bits (12 bytes), unique random per value
- **Authentication Tag**: 128 bits (16 bytes)
- **Nonce Collision Prevention**: Checked during encryption

### Key Derivation

- **Argon2id** (primary)
  - Memory: 65536 KB (64 MB)
  - Time Cost: 3 iterations
  - Parallelism: 1 thread
  - Salt: 128 bits random

- **scrypt** (fallback)
  - N: 2^15 (32768)
  - r: 8
  - p: 1
  - Salt: 128 bits random
  - Output: 32 bytes

## File Format

The `.envx` file is JSON with the following structure:

```json
{
  "version": 1,
  "cipher": "aes-256-gcm",
  "kdf": {
    "type": "argon2id" | "scrypt" | "none",
    "salt": "base64-encoded-salt",
    "params": {...}
  },
  "nonce_map": {
    "KEY_NAME": "base64-nonce",
    ...
  },
  "values": {
    "KEY_NAME": "base64-ciphertext-with-tag",
    ...
  },
  "meta": {
    "created_at": "ISO8601 timestamp"
  }
}
```

## Error Handling

### Error Types

- `EnvxError`: Base class for all custom errors
- `ValidationError`: Invalid input or file format
- `DecryptionError`: Failed decryption or MAC verification
- `KdfError`: Key derivation failure
- `FileExistsError`: File already exists
- `MissingKeyError`: Key file not found
- `EncryptionError`: Encryption operation failed

All errors include optional context for debugging.

## Logging

### Log Levels

- `debug`: Detailed information (rarely shown)
- `info`: Normal operations (default)
- `warn`: Potentially problematic situations
- `error`: Error conditions

### Sensitive Information

Logs never include:

- Passwords or passphrases
- Encryption keys or salts
- Plaintext values
- File contents or paths in context
- Full error stacks in production

## Testing

### Test Files

- `test/crypto.test.ts`: KDF and encryption (6 tests)
- `test/encryption.test.ts`: Encryption operations (14 tests)
- `test/format.test.ts`: Format validation (5 tests)
- `test/cli.test.ts`: CLI commands (3 tests)
- `test/integration.test.ts`: End-to-end workflows (15 tests)

Total: 43 tests covering all critical paths.

## Performance

### Key Derivation

- Argon2id: ~300ms (intentionally slow for security)
- scrypt: ~200ms (fallback)

### Encryption

- AES-256-GCM: Hardware-accelerated on modern systems
- Per-value: <1ms for typical environment files

## Security Guarantees

### What envx Protects

- Prevents plaintext secrets in version control
- Detects tampering with encrypted data
- Resists GPU and side-channel attacks (Argon2id)
- Unique nonces prevent repeating ciphertexts

### What envx Does Not Protect

- Runtime memory inspection
- Key compromise
- Weak passwords in password-based mode
- Malicious code in the same process
- Physical access to systems

## Development

### Build

```bash
npm run build    # TypeScript compilation
npm run lint     # ESLint checking
npm run format   # Prettier formatting
```

### Test

```bash
npm test         # Run all tests
npm run test:watch  # Watch mode
```

### File Structure

```
src/
├── index.ts
├── cli/
│   ├── index.ts
│   └── commands/
├── crypto/
│   ├── encrypt.ts
│   ├── decrypt.ts
│   ├── kdf.ts
│   └── memory.ts
├── format/
│   ├── envx-format.ts
│   └── schema.json
├── lib/
│   └── envx.ts
├── types/
│   └── index.ts
├── utils/
│   ├── errors.ts
│   ├── logger.ts
│   └── memory.ts
├── config/
│   ├── validator.ts
│   └── schema.json
└── core/
```

6. **Audit Logging**: Centralized logging for compliance
