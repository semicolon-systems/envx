# Architecture

## Overview

envx is a secure secret management tool with three layers:

```
┌─────────────────────────────────┐
│         CLI (commands)          │
│  init, encrypt, decrypt, etc.   │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│       Library (Envx class)      │
│  Orchestrates crypto & format   │
└──────────────┬──────────────────┘
               │
┌──────────────▼────────────────────────────────┐
│  Crypto Layer    │   Format Layer   │  Utils  │
│  ┌────────────┐  │  ┌────────────┐  │         │
│  │ KDF        │  │  │ JSON       │  │ Memory  │
│  │ Encrypt    │  │  │ validation │  │ Errors  │
│  │ Decrypt    │  │  │ Schema     │  │         │
│  └────────────┘  │  └────────────┘  │         │
└─────────────────────────────────────────────┘
         Core Dependencies
      ↓
  ┌──────────────────────┐
  │  libsodium           │
  │  argon2              │
  │  ajv                 │
  │  commander           │
  └──────────────────────┘
```

## Module Structure

### `/src/cli/`

Command-line interface using Commander.js

- **commands/**: Individual command implementations
  - `init.ts`: Key generation
  - `encrypt.ts`: File encryption
  - `decrypt.ts`: File decryption
  - `show.ts`: Display decrypted values
  - `run.ts`: Execute command with env vars
  - `rotate.ts`: Key rotation
  - `verify.ts`: File verification
  - `check.ts`: Schema validation
  - `export-vars.ts`: Export as shell variables

- **index.ts**: Command registration and routing

### `/src/crypto/`

Cryptographic primitives

- **kdf.ts**: Key derivation (Argon2id, scrypt)
- **encrypt.ts**: XChaCha20-Poly1305 encryption
- **decrypt.ts**: XChaCha20-Poly1305 decryption

### `/src/format/`

File format and validation

- **envx-format.ts**: JSON parsing, validation, building
- **schema.json**: JSON Schema for .envx files

Validation flow:

```
Raw JSON → Parse → Validate (AJV) → Type-check → Custom rules → EnvxFile
```

### `/src/lib/`

High-level API

- **envx.ts**: `Envx` class orchestrating crypto and I/O

### `/src/utils/`

Utilities and error handling

- **errors.ts**: Custom exception types
- **memory.ts**: Buffer wiping, cleanup helpers

### `/test/`

Test suites using Vitest

- **crypto.test.ts**: KDF, encryption/decryption
- **format.test.ts**: JSON parsing, validation
- **cli.test.ts**: Library integration

## Data Flow

### Encryption

```
.env file (plaintext)
    ↓
Parse KEY=VALUE pairs
    ↓
Load encryption key from .envx.key
    ↓
For each value:
  • Generate random 24-byte nonce
  • Encrypt with XChaCha20-Poly1305
  • Store base64(nonce) and base64(ciphertext)
    ↓
Build EnvxFile JSON
    ↓
Serialize and write to .envx
    ↓
Wipe all sensitive buffers
```

### Decryption

```
.envx file (base64-encoded)
    ↓
Parse and validate JSON
    ↓
Load encryption key from .envx.key
    ↓
For each encrypted value:
  • Decode base64 nonce
  • Decode base64 ciphertext
  • Decrypt with XChaCha20-Poly1305
  • Verify MAC (detects tampering)
    ↓
Return plaintext dict
    ↓
Wipe all sensitive buffers
```

### Key Derivation

```
User password
    ↓
Derive key using Argon2id (or scrypt):
  • Random 16-byte salt
  • Memory: 65536 KB
  • Time: 3 iterations
  • Parallelism: 1 thread
    ↓
Generate 32-byte key
    ↓
Store key in .envx.key
    ↓
Wipe password buffer
```

## Versioning Strategy

### .envx File Format

Supports future algorithm migration:

```json
{
  "version": 1,
  "cipher": "xchacha20-poly1305",
  "kdf": { "type": "argon2id", ... }
}
```

**v1.0**:

- Cipher: XChaCha20-Poly1305
- KDF: Argon2id + scrypt

**Future versions** (if standards evolve):

- v2: Post-quantum KEM (Kyber)
- v3: Different cipher (TweetNaCl)

Validation: Reject unknown versions to prevent downgrade attacks.

## Memory Safety

### Sensitive Data

- Passwords
- Encryption keys
- Plaintext values
- Nonces

### Wiping

After use, sensitive buffers are wiped:

```typescript
const buf = Buffer.from(secret);
// Use...
wipeBuffer(buf); // Fill with zeros
```

⚠️ **Limitations**: No protection against:

- Spectre/Meltdown attacks
- Memory dumps
- Swap attacks

Mitigations applied:

- Minimize buffer lifetime (scope-based cleanup)
- Avoid logging plaintext
- Use `--no-warnings` in production

## Error Handling

Custom exception hierarchy:

```
EnvxError
├── ValidationError
├── DecryptionError
├── KdfError
├── FileExistsError
└── MissingKeyError
```

All errors:

- Include descriptive messages
- Never leak secrets in messages
- Exit gracefully with non-zero code

## Dependencies

### Runtime

- **libsodium-wrappers**: XChaCha20-Poly1305
- **argon2**: Argon2id KDF
- **commander**: CLI framework
- **ajv**: JSON Schema validation
- **dotenv**: .env parsing (for examples)

### Development

- **TypeScript**: Type safety
- **Vitest**: Test runner
- **ESLint**: Linting
- **Prettier**: Code formatting
- **@types/node**: Node.js typings

## Security Boundaries

### Trust Assumptions

1. **Key file**: Treated as trusted (on disk, not encrypted)
2. **.envx file**: Treated as untrusted (encrypted, publicly committable)
3. **Process memory**: Treated as untrusted (can be dumped)

### Invariants Maintained

- Every encrypted value has a corresponding nonce
- Every nonce has a corresponding ciphertext
- MAC verification prevents tampering
- No plaintext secrets are persisted

## Testing Strategy

### Unit Tests

- KDF consistency and derivation
- Encryption/decryption round-trips
- Format parsing and validation
- Error cases (wrong key, tampering, etc.)

### Integration Tests

- Full workflows (init → encrypt → decrypt)
- File I/O and serialization
- CLI command execution

### Security Tests

- Tampered ciphertext rejection
- Wrong password failure
- MAC verification

---