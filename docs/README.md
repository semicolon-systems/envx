# envx

[![CI](https://github.com/semicolon-systems/envx/workflows/CI/badge.svg)](https://github.com/semicolon-systems/envx/actions)
[![npm version](https://img.shields.io/npm/v/envx.svg)](https://www.npmjs.com/package/envx)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Secure encrypted `.env` replacement for Git**

envx lets you commit encrypted secrets safely into version control using XChaCha20-Poly1305 authenticated encryption and Argon2id key derivation.

## Features

- 🔐 **XChaCha20-Poly1305**: AEAD authenticated encryption with per-value nonces
- 🔑 **Argon2id KDF**: Modern password-based key derivation (with scrypt fallback)
- 📦 **Library + CLI**: Use as npm module or command-line tool
- 🎯 **Zero-disk plaintext**: Secrets never touch disk unless explicitly written
- ✅ **Strict validation**: JSON Schema-based format validation
- 🧪 **Fully tested**: Comprehensive test suite included
- 📚 **Production-ready**: TypeScript, ESLint, Prettier, CI

## Installation

```bash
npm install envx
```

Or use as CLI:

```bash
npm install -g envx
```

## Quick Start

### Initialize

```bash
# Generate random key
envx init

# Or use password-based key derivation
envx init --mode password
```

This creates `.envx.key` (or your custom key path).

### Encrypt

```bash
# Encrypt .env file → .envx
envx encrypt .env

# Specify output
envx encrypt .env --output secrets.envx
```

### Decrypt & Run

```bash
# Show decrypted values
envx show .envx

# Run command with decrypted env vars
envx run -- node app.js

# Export for GitHub Actions
envx export-vars .envx
```

### Verify & Check

```bash
# Verify file integrity
envx verify .envx

# Validate against schema
envx check .env.schema.json --schema schema.json
```

## Library Usage

```typescript
import { Envx, deriveKey, encryptValues, decryptValues } from 'envx';

const envx = new Envx('.envx.key');

// Initialize
await envx.init('random');

// Encrypt
const result = await envx.encrypt('.env');
console.log(result);

// Decrypt
const secrets = await envx.decrypt('.envx');
console.log(secrets);

// Verify
const { valid } = envx.verify('.envx');
```

## Security Model

### Threat Model

✅ **Protects against:**
- Accidental exposure of secrets in Git history
- Unauthorized access if repository is compromised
- Dictionary attacks (via Argon2id)
- Tampering (via authenticated encryption)

❌ **Does not protect against:**
- Key compromise
- Memory attacks against running processes
- Side-channel attacks
- Keylogging during input

### Cryptography

**Encryption:** XChaCha20-Poly1305
- AEAD cipher with 256-bit keys
- 24-byte random nonce per value
- Detects ciphertext tampering

**Key Derivation:** Argon2id (primary) / scrypt (fallback)
- Argon2id: 65536 KB memory, 3 time cost, 1 parallelism
- scrypt: N=2^15, r=8, p=1

**Storage:** JSON format with Base64 encoding
- Supports versioning for future algorithm changes
- Explicit nonce per key for verification

## .envx Format

```json
{
  "version": 1,
  "cipher": "xchacha20-poly1305",
  "kdf": {
    "type": "argon2id",
    "salt": "base64...",
    "params": {
      "memory": 65536,
      "time": 3,
      "parallelism": 1
    }
  },
  "nonce_map": {
    "API_KEY": "base64nonce=="
  },
  "values": {
    "API_KEY": "base64ciphertext=="
  },
  "meta": {
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

## GitHub Actions Example

```yaml
env:
  ENVX_KEY: ${{ secrets.ENVX_KEY }}

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup env
        run: |
          echo "$ENVX_KEY" > .envx.key
          npx envx export-vars .envx >> $GITHUB_ENV
          rm .envx.key
      
      - name: Run app
        run: npm run build
```

## CLI Reference

### envx init
```bash
envx init [--mode random|password] [--key path]
```

### envx encrypt
```bash
envx encrypt <file> [--output path] [--key path]
```

### envx decrypt
```bash
envx decrypt <file> [--key path] [--write]
```

### envx show
```bash
envx show <file> [--key path]
```

### envx run
```bash
envx run [--key path] [--envx path] -- <command...>
```

### envx rotate
```bash
envx rotate <new-key> [--key path] [--envx path]
```

### envx verify
```bash
envx verify <file>
```

### envx check
```bash
envx check <file> [--schema path]
```

### envx export-vars
```bash
envx export-vars <file> [--key path]
```

## Troubleshooting

**Q: "Key file not found"**
```bash
# Generate new key
envx init

# Or restore from backup
cp .envx.key.backup .envx.key
```

**Q: "Failed to decrypt - MAC verification failed"**
- File is corrupted or tampered with
- Using wrong key
- Verify file: `envx verify .envx`

**Q: Can I use password-based encryption?**
Yes: `envx init --mode password` derives key from password using Argon2id.

**Q: Memory wiping guarantees?**
We use `Buffer.fill(0)` which is not guaranteed against all attacks. For highly sensitive scenarios, consider HSM-based key storage.

## Contributing

See [CONTRIBUTING.md](./docs/CONTRIBUTING.md)

## License

MIT © Semicolon Systems

## Security

Found a vulnerability? See [SECURITY.md](./docs/SECURITY.md) for reporting via GitHub Security Advisories.
