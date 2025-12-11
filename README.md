# envx

[![CI](https://github.com/semicolon-systems/envx/workflows/CI/badge.svg)](https://github.com/semicolon-systems/envx/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Secure encrypted `.env` replacement for storing secrets in version control.

envx encrypts environment variables using AES-256-GCM authenticated encryption with Argon2id key derivation. Commit encrypted `.envx` files safely to Git while keeping plaintext secrets out of version control entirely.

## Features

- AES-256-GCM authenticated encryption with unique nonces per value
- Argon2id key derivation for password-based keys (scrypt fallback)
- Library and CLI for integration flexibility
- Strict validation with JSON Schema
- File permissions enforcement (0600 for sensitive files)
- Comprehensive test coverage
- TypeScript with full type safety

## Installation

```bash
npm install envx-secure
```

Global CLI installation:

```bash
npm install -g envx-secure
```

## Quick Start

### Initialize

Generate a random encryption key:

```bash
envx init
```

This creates `.envx.key` (32 random bytes). Add this file to `.gitignore`.

For password-based key derivation:

```bash
envx init --mode password
```

You'll be prompted for a password (minimum 12 characters). Input is hidden and the CLI will not display raw salts or secrets.


### Encrypt

Encrypt your `.env` file (original file remains unchanged):

```bash
envx encrypt .env
```

This creates `.envx` containing encrypted values. The `.envx` file is safe to commit.

### Decrypt & Use

Display decrypted values (avoid `--write` unless strictly necessary):

```bash
envx show .envx
```

Run a command with decrypted environment:

```bash
envx run -- node app.js
```

Export for shell evaluation:

```bash
eval $(envx export-vars .envx)
```

### Verify

Check file integrity and format:

```bash
envx verify .envx
```

Validate against JSON Schema:

```bash
envx check .envx --schema custom-schema.json
```

### Key Rotation

Rotate to a new encryption key:

```bash
envx rotate .envx.key.new --key .envx.key --envx .envx
```

This decrypts with the old key and re-encrypts with the new key.

## Library Usage

```typescript
import { Envx } from 'envx-secure';

const envx = new Envx('.envx.key');

await envx.init('random');

await envx.encrypt('.env', '.envx');

const secrets = await envx.decrypt('.envx');
console.log(secrets);

const { valid, details } = envx.verify('.envx');
console.log(`Valid: ${valid}, Details: ${details}`);
```

## CLI Reference

### `envx init`

Initialize a new key file.

Options:

- `-m, --mode <mode>` - Key mode: `random` (default) or `password`
- `-k, --key <path>` - Key file path (default: `.envx.key`)

Example:

```bash
envx init --mode random --key .envx.key
```

### `envx encrypt <file>`

Encrypt a `.env` file to `.envx` format.

Options:

- `-o, --output <path>` - Output path (default: replaces `.env` with `.envx`)
- `-k, --key <path>` - Key file path (default: `.envx.key`)

Example:

```bash
envx encrypt .env --output production.envx
```

### `envx decrypt <file>`

Decrypt an `.envx` file and print values.

Options:

- `-k, --key <path>` - Key file path (default: `.envx.key`)
- `-w, --write` - Write plaintext to disk (unsafe, default: false)

Example:

```bash
envx decrypt .envx
```

Warning: Use `--write` only when necessary, as it writes plaintext secrets to disk.

### `envx show <file>`

Display decrypted values as JSON.

Options:

- `-k, --key <path>` - Key file path (default: `.envx.key`)

Example:

```bash
envx show .envx
```

### `envx run <command...>`

Execute a command with decrypted environment variables.

Options:

- `-k, --key <path>` - Key file path (default: `.envx.key`)
- `-e, --envx <path>` - Envx file path (default: `.envx`)

Example:

```bash
envx run -- npm start
envx run -- docker-compose up
```

### `envx export-vars <file>`

Export decrypted variables in shell format.

Options:

- `-k, --key <path>` - Key file path (default: `.envx.key`)

Example:

```bash
envx export-vars .envx
eval $(envx export-vars .envx)
```

### `envx verify <file>`

Verify `.envx` file integrity and format.

Example:

```bash
envx verify .envx
```

### `envx check <file>`

Validate `.envx` file against JSON Schema.

Options:

- `-s, --schema <path>` - Custom schema file path

Example:

```bash
envx check .envx --schema .env.schema.json
```

### `envx rotate <new-key>`

Rotate encryption key and re-encrypt file.

Options:

- `-k, --key <path>` - Current key file path (default: `.envx.key`)
- `-e, --envx <path>` - Envx file path (default: `.envx`)

Example:

```bash
envx rotate .envx.key.new
```

## File Format

The `.envx` file uses JSON with the following structure:

```json
{
  "version": 1,
  "cipher": "aes-256-gcm",
  "kdf": {
    "type": "none"
  },
  "nonce_map": {
    "API_KEY": "base64-encoded-nonce",
    "DATABASE_URL": "base64-encoded-nonce"
  },
  "values": {
    "API_KEY": "base64-encoded-ciphertext",
    "DATABASE_URL": "base64-encoded-ciphertext"
  },
  "meta": {
    "created_at": "2025-12-11T00:00:00.000Z"
  }
}
```

Each value has its own unique 12-byte nonce. Ciphertext includes the 16-byte GCM authentication tag prepended.

## Security

### Encryption

- AES-256-GCM provides authenticated encryption
- Unique random nonces prevent nonce reuse attacks
- Authentication tags detect tampering
- Key must be exactly 32 bytes (256 bits)

### Key Derivation

Argon2id parameters:

- Memory: 65536 KB (64 MB)
- Time: 3 iterations
- Parallelism: 1

Scrypt fallback parameters:

- N: 32768 (2^15)
- r: 8
- p: 1
- dkLen: 32

### Best Practices

1. Never commit `.envx.key` to version control
2. Use strong passwords (minimum 12 characters) for password-based keys
3. Rotate keys periodically
4. Set file permissions to 0600 for key files
5. Use `envx run` instead of decrypting to disk
6. Audit `.envx` files before committing

### Threat Model

envx protects against:

- Accidental secret exposure in version control
- Unauthorized access to encrypted files
- Tampering with encrypted data

envx does NOT protect against:

- Compromised key files
- Weak passwords in password-based mode
- Runtime memory attacks
- Malicious code with key file access

## GitHub Actions

Example workflow:

```yaml
- name: Decrypt secrets
  env:
    ENVX_KEY: ${{ secrets.ENVX_KEY }}
  run: |
    echo "$ENVX_KEY" | base64 -d > .envx.key
    chmod 600 .envx.key
    eval $(npx envx-secure export-vars .envx)

- name: Run application
  run: npm start
```

Store your base64-encoded key in GitHub Secrets:

```bash
base64 < .envx.key
```

## Compatibility

- Node.js 18.x or later
- Linux, macOS, Windows (WSL recommended)
- UTF-8 environment variable values

## Troubleshooting

### "Key file not found"

Ensure `.envx.key` exists in the expected location or specify `-k` option.

### "Invalid key length"

Key file must be exactly 32 bytes. Re-initialize with `envx init`.

### "Decryption failed"

Wrong key, corrupted file, or tampered ciphertext. Verify key file and `.envx` integrity.

### "Permission denied"

Key file permissions may be too restrictive. Ensure readable by current user.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

MIT - see [LICENSE](LICENSE)

## Security

See [SECURITY.md](SECURITY.md) for security details.

## Security Model

### Cryptography

**Encryption:** AES-256-GCM

- AEAD cipher with 256-bit keys
- 12-byte random nonce per value
- 16-byte authentication tag
- Detects ciphertext tampering

**Key Derivation:** Argon2id (primary) / scrypt (fallback)

- Argon2id: 65536 KB memory, 3 time cost, 1 parallelism
- scrypt: N=2^15, r=8, p=1
- Random 16-byte salt per key

### What envx protects against:

- ✅ Accidental exposure of secrets in Git history
- ✅ Unauthorized access if repository is compromised
- ✅ Dictionary attacks (via Argon2id)
- ✅ Tampering (via authenticated encryption)

### What envx does NOT protect against:

- ❌ Key compromise
- ❌ Memory attacks against running processes
- ❌ Side-channel attacks
- ❌ Keylogging during input

## .envx Format

```json
{
  "version": 1,
  "cipher": "aes-256-gcm",
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

| Command                               | Description                     |
| ------------------------------------- | ------------------------------- |
| `envx init [--mode random\|password]` | Initialize new project with key |
| `envx encrypt <file> [--output path]` | Encrypt .env file               |
| `envx decrypt <file>`                 | Decrypt and print to stdout     |
| `envx show <file>`                    | Show decrypted values (JSON)    |
| `envx run -- <command>`               | Run command with decrypted env  |
| `envx rotate <new-key>`               | Rotate to new encryption key    |
| `envx verify <file>`                  | Verify file integrity           |
| `envx check <file> [--schema path]`   | Validate against schema         |
| `envx export-vars <file>`             | Export as KEY=VALUE             |

## Documentation

- [Security Policy](./docs/SECURITY.md) - Threat model and best practices
- [Contributing](./docs/CONTRIBUTING.md) - Development guide
- [Architecture](./docs/ARCHITECTURE.md) - Technical design
- [Changelog](./docs/CHANGELOG.md) - Version history

## Troubleshooting

**Q: "Key file not found"**

```bash
# Generate new key
envx init
```

**Q: "Failed to decrypt - MAC verification failed"**

- File is corrupted or tampered with
- Using wrong key
- Verify file: `envx verify .envx`

**Q: Can I use password-based encryption?**

Yes: `envx init --mode password` derives key from password using Argon2id.

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./docs/CONTRIBUTING.md) for guidelines.

## License

MIT © Semicolon Systems

## Author

Dhananjay Mahtha - [LinkedIn Profile](https://linkedin.com/in/dhananjay-mahtha/)
