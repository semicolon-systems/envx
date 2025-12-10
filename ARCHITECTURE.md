# envx-secure Architecture

## Overview

`envx-secure` is a production-grade encrypted environment variable manager using XChaCha20-Poly1305 encryption with Argon2id key derivation. The codebase follows a modular, domain-driven architecture with clear separation of concerns and comprehensive error handling.

## Module Structure

### Core Modules

#### `src/logging/`
Structured logging and error handling layer.

- **`logger.ts`**: JSON-structured logging system
  - Functions: `log()`, convenience functions (`logger.info()`, `logger.warn()`, `logger.error()`)
  - Features: Timestamp, level, operation, context, never logs secrets
  - Types: `LogLevel`, `LogContext`, `LogEntry`

- **`errors.ts`**: Custom error hierarchy
  - Base: `EnvxError` with code and metadata
  - Specialized: `CipherError`, `KdfError`, `ValidationError`, `FileError`, `MissingKeyError`, `DecryptionError`
  - All errors include metadata for debugging and proper error tracking

#### `src/crypto/`
Cryptographic operations for encryption and key derivation.

- **`cipher.ts`**: AES-256-GCM AEAD cipher
  - Functions: `encryptValue()`, `decryptValue()`
  - Features: Per-value random nonces, base64 encoding, authenticated encryption
  - Errors: `CipherError`, `DecryptionError`

- **`kdf.ts`**: Key derivation functions
  - Functions: `deriveKeyArgon2id()`, `deriveKeyScrypt()`, `deriveKey()`
  - Exports: `DEFAULT_ARGON2_PARAMS`, `DEFAULT_SCRYPT_PARAMS`
  - Types: `Argon2idParams`, `ScryptParams`, `KdfResult`, `KdfMeta`
  - Errors: `KdfError`

- **`memory.ts`**: Secure memory operations
  - Functions: `wipeBuffer()` - secure buffer clearing

#### `src/config/`
Configuration management and validation.

- **`validator.ts`**: Schema validation using AJV
  - Functions: `validateEnvxFile()`
  - Validates envx file format (version, cipher, KDF metadata, nonce maps)
  - Errors: `ValidationError`

- **`schema.json`**: JSON Schema for envx file format
  - Version 1 specification
  - Cipher: xchacha20-poly1305
  - KDF: argon2id, scrypt, or none

#### `src/types/`
Centralized TypeScript type definitions.

- **`index.ts`**: Global interfaces and types
  - `KdfMeta`, `KdfResult`: Key derivation metadata and results
  - `Argon2idParams`, `ScryptParams`: KDF parameter types
  - `EnvxFile`: Encrypted file format
  - `EncryptionResult`: Encryption operation results
  - `NonceMap`: Per-value nonce tracking

#### `src/cli/`
Command-line interface.

- **`index.ts`**: Commander.js setup
- **`commands/`**: Individual commands
  - `encrypt.ts`: Encrypt .env file to .env.enc
  - `decrypt.ts`: Decrypt .env.enc to .env
  - `generate.ts`: Generate random encryption key
  - `status.ts`: Show encryption status
  - Additional utility commands

#### `src/utils/`
Utility functions.

- **`format.ts`**: Format and parse .env files
- **`random.ts`**: Random buffer generation helpers

### Main Entry Point

**`src/index.ts`**: Public API exports
- Core functions: `encrypt()`, `decrypt()`, `generateKey()`
- Types: `EnvxFile`, `EncryptionResult`
- Logger: `logger`, `LogLevel`, `LogContext`
- Errors: All custom error types

## Data Flow

```
[Password/Key] → [KDF Module] → [32-byte Key]
                                    ↓
                            [Cipher Module]
                            ↓
                    [AES-256-GCM Encryption]
                            ↓
                    [Base64 + Nonce + Tag]
                            ↓
                    [EnvxFile JSON Format]
```

## Error Handling Strategy

### Error Hierarchy
```
Error (Node.js)
  ↓
EnvxError (Custom Base)
  ├── CipherError (Encryption/decryption)
  ├── KdfError (Key derivation)
  ├── ValidationError (Schema validation)
  ├── FileError (File I/O)
  ├── MissingKeyError (Missing encryption key)
  └── DecryptionError (Decryption failure)
```

### Error Usage
All custom errors include:
- `code`: Machine-readable error identifier
- `message`: Human-readable description
- `metadata`: Context object with details (cause, operation, etc.)

Example:
```typescript
try {
  await deriveKeyArgon2id(password);
} catch (e) {
  if (e instanceof KdfError) {
    logger.error('KDF failed', { error: e.metadata });
  }
}
```

## Logging Strategy

### Log Levels
- `info`: Normal operations (encryption started, etc.)
- `warn`: Potentially problematic situations (retries, etc.)
- `error`: Error conditions with recovery

### Never Logged
- Passwords
- Encryption keys
- Plaintext environment values
- Full error stacks in production logs

### Log Example
```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "info",
  "message": "Environment file encrypted",
  "operation": "encrypt",
  "context": {
    "kdf": "argon2id",
    "fileSize": 1024
  }
}
```

## Cryptographic Specifications

### Encryption
- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Size**: 256 bits (32 bytes)
- **Nonce**: 96 bits (12 bytes), random per value
- **Authentication Tag**: 128 bits (16 bytes)

### Key Derivation
- **Primary**: Argon2id
  - Memory: 65 MB
  - Time Cost: 3 iterations
  - Parallelism: 1 thread
  - Salt: 128 bits (16 bytes), random

- **Fallback**: scrypt
  - N: 32768 (2^15)
  - r: 8
  - p: 1
  - dkLen: 32 bytes
  - Salt: 128 bits (16 bytes), random

## Testing

### Test Coverage
- `test/crypto.test.ts`: KDF and cipher operations (6 tests)
- `test/cli.test.ts`: CLI command execution (3 tests)
- `test/format.test.ts`: .env format parsing (5 tests)

### Running Tests
```bash
npm test              # Run all tests
npm run coverage      # Generate coverage report
npm run lint          # Lint code
npm run build         # Build TypeScript
```

## Development Workflow

### Adding New Features
1. Create new module in appropriate domain folder
2. Use custom error types from `src/logging/errors.ts`
3. Use structured logging from `src/logging/logger.ts`
4. Define types in `src/types/index.ts`
5. Export from `src/index.ts`
6. Add tests in `test/` directory
7. Update ARCHITECTURE.md

### Code Style
- TypeScript strict mode enabled
- ESLint + Prettier for formatting
- JSDoc docstrings for public APIs
- Error handling with try-catch, never silent failures

## File Organization

```
envx-secure/
├── src/
│   ├── logging/           # Logging & error handling layer
│   │   ├── logger.ts
│   │   └── errors.ts
│   ├── crypto/            # Cryptographic operations
│   │   ├── cipher.ts
│   │   ├── kdf.ts
│   │   └── memory.ts
│   ├── config/            # Configuration & validation
│   │   ├── validator.ts
│   │   └── schema.json
│   ├── types/             # Type definitions
│   │   └── index.ts
│   ├── utils/             # Utility functions
│   │   ├── format.ts
│   │   └── random.ts
│   ├── cli/               # CLI interface
│   │   ├── index.ts
│   │   └── commands/
│   └── index.ts           # Main export
├── test/                  # Unit tests
├── dist/                  # Compiled JavaScript
├── package.json
├── tsconfig.json
├── eslintrc.js
└── ARCHITECTURE.md        # This file
```

## Performance Considerations

### Key Derivation
- Argon2id: ~300ms per derivation (intentionally slow for security)
- scrypt: ~200ms per derivation
- Keys are cached in memory during application lifecycle

### Encryption
- AES-256-GCM: Hardware-accelerated on modern CPUs
- Per-value nonces: No IV reuse attacks possible
- Minimal memory overhead

### File I/O
- Streaming for large files (planned)
- Current: In-memory for safety (protects secrets from disk)

## Security Model

### Threat Model
- **Protects Against**: Unauthorized reading of encrypted environment files
- **Not Protected**: Runtime memory inspection, process dumps
- **Not Intended For**: Storing multiple independent secrets per file

### Trust Assumptions
- Password strength is user's responsibility
- Node.js runtime is trusted
- File system access controls are in place

## Future Enhancements

1. **Streaming Support**: For large environment files
2. **Plugin Architecture**: Custom encryption algorithms
3. **Key Management**: Azure Key Vault, AWS KMS integration
4. **Configuration Profiles**: Different KDF params per environment
5. **Secrets Rotation**: Key rotation utilities
6. **Audit Logging**: Centralized logging for compliance
