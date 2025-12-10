# envx

[![CI](https://github.com/semicolon-systems/envx/workflows/CI/badge.svg)](https://github.com/semicolon-systems/envx/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Commit encrypted environment variables to Git without worry. envx uses AES-256-GCM and Argon2id to keep your secrets safe while letting you version control them alongside your code.

## Features

- 🔐 **Strong encryption** - AES-256-GCM with authenticated encryption
- 🔑 **Password support** - Argon2id key derivation (scrypt fallback)
- 📦 **Flexible** - Use as CLI tool or Node.js library
- 🎯 **Safe by default** - Decrypted values stay in memory
- ✅ **Validated** - JSON Schema ensures file integrity
- 🧪 **Well tested** - Comprehensive test coverage
- 📚 **TypeScript** - Full type definitions included

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
# Generate a random encryption key
envx init

# Or derive from a password
envx init --mode password
```

This creates `.envx.key` - keep it secret and don't commit it.

### Encrypt

```bash
# Encrypt your .env file
envx encrypt .env

# Save to specific output
envx encrypt .env --output secrets.envx
```

### Decrypt & Run

```bash
# View decrypted values
envx show .envx

# Run commands with decrypted environment
envx run -- node app.js

# Export for CI/CD (GitHub Actions, etc.)
envx export-vars .envx
```

### Verify & Check

```bash
# Verify file integrity
envx verify .envx

# Validate against schema
envx check .envx --schema .env.schema.json
```

## Library Usage

```typescript
import { Envx } from 'envx';

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

## Security

### How it works

**Encryption:** AES-256-GCM
- Authenticated encryption with 256-bit keys
- Random 12-byte nonce per value
- 16-byte authentication tag detects tampering

**Key Derivation:** Argon2id (with scrypt fallback)
- Argon2id: 64 MB memory, 3 iterations
- scrypt: N=2^15, r=8, p=1 (fallback)
- Random 16-byte salt per key

### What envx protects

- ✅ Accidental secret leaks in Git
- ✅ Unauthorized access without key
- ✅ Tampering detection
- ✅ Weak passwords (Argon2id)

### What it doesn't protect

- ❌ Compromised encryption keys
- ❌ Memory dumps of running processes
- ❌ Side-channel attacks
- ❌ Keyloggers

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

## CLI Commands

| Command | Description |
|---------|-------------|
| `envx init [--mode random\|password]` | Initialize new project with key |
| `envx encrypt <file> [--output path]` | Encrypt .env file |
| `envx decrypt <file>` | Decrypt and print to stdout |
| `envx show <file>` | Show decrypted values (JSON) |
| `envx run -- <command>` | Run command with decrypted env |
| `envx rotate <new-key>` | Rotate to new encryption key |
| `envx verify <file>` | Verify file integrity |
| `envx check <file> [--schema path]` | Validate against schema |
| `envx export-vars <file>` | Export as KEY=VALUE |

## Documentation

- [Security Policy](./docs/SECURITY.md) - Threat model and best practices
- [Contributing](./docs/CONTRIBUTING.md) - Development guide
- [Architecture](./docs/ARCHITECTURE.md) - Technical design
- [Changelog](./docs/CHANGELOG.md) - Version history

## Troubleshooting

**"Key file not found"**
```bash
envx init  # Generate a new key
```

**"Failed to decrypt - MAC verification failed"**

The file might be corrupted or you're using the wrong key. Try:
```bash
envx verify .envx
```

**Using passwords instead of random keys?**

Yes - `envx init --mode password` derives keys from passwords using Argon2id.

## Contributing

We welcome contributions! Check out [CONTRIBUTING.md](./docs/CONTRIBUTING.md) to get started.

## License

MIT © Semicolon Systems

## Security

Found a security issue? Email us at security@semicolon-systems.dev - see [SECURITY.md](./docs/SECURITY.md) for details.
