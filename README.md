# envx

[![CI](https://github.com/semicolon-systems/envx/workflows/CI/badge.svg)](https://github.com/semicolon-systems/envx/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Production-grade encrypted environment variable management for Git workflows**

envx enables teams to safely commit encrypted secrets into version control using military-grade AES-256-GCM encryption and Argon2id key derivation. No more scattered `.env.example` files or secrets in CI/CD platforms—commit your encrypted secrets alongside your code.

## Why envx?

**The Problem:** Modern applications need secrets (API keys, database passwords, tokens), but storing them is risky:
- `.env` files can't be committed (accidental leaks)
- Secrets platforms create vendor lock-in
- Manual secret distribution doesn't scale
- `.env.example` files quickly become stale

**The Solution:** envx encrypts each secret individually with AES-256-GCM, allowing you to commit the encrypted `.envx` file to Git. Your team shares the encryption key through secure channels (password manager, secrets vault), and everyone can decrypt locally or in CI/CD.

## Key Features

- 🔐 **Military-Grade Encryption**: AES-256-GCM with 128-bit authentication tags
- **Memory-Hard KDF**: Argon2id resists GPU/ASIC attacks (scrypt fallback)
- **Dual Interface**: Use as CLI tool or programmatic Node.js library
- **Zero Plaintext Leaks**: Secrets never touch disk unencrypted
- **Schema Validation**: JSON Schema ensures file integrity
- **Battle-Tested**: Comprehensive test suite with edge cases
- **TypeScript Native**: Full type safety and IDE autocomplete
- **CI/CD Ready**: GitHub Actions, GitLab CI, CircleCI examples

## Security Guarantees

**What envx protects against:**
- Accidental commit of plaintext secrets to Git
- Unauthorized repository access without the encryption key
- Data tampering (authenticated encryption catches modifications)
- Weak passwords (Argon2id with 64MB memory cost)
- Rainbow table attacks (random 128-bit salt per key)

**What envx does NOT protect against:**
- Compromise of the encryption key itself
- Memory dumps of running processes
- Side-channel attacks (timing, cache, power analysis)
- Social engineering attacks (keyloggers, shoulder surfing)

## Installation

```bash
# As a CLI tool (global)
npm install -g envx

# As a library (project dependency)
npm install envx
```

## Quick Start

### 1. Initialize Encryption Key

```bash
# Option A: Random key (recommended for teams)
envx init

# Option B: Password-derived key (for solo projects)
envx init --mode password
```

This creates `.envx.key` (256-bit key). **Add it to `.gitignore` immediately.**

### 2. Encrypt Your .env File

```bash
# Encrypt existing .env → .envx
envx encrypt .env

# Custom output path
envx encrypt .env --output production.envx
```

The `.envx` file is safe to commit to Git.

### 3. Use Encrypted Secrets

```bash
# View decrypted values (stdout)
envx show .envx

# Run command with decrypted environment
envx run -- npm start
envx run -- python app.py

# Export for shell use
eval "$(envx export-vars .envx)"

# GitHub Actions integration
envx export-vars .envx >> $GITHUB_ENV
```

### 4. Verify and Validate

```bash
# Check file integrity
envx verify .envx

# Validate against custom schema
envx check .envx --schema .env.schema.json
```

## CLI Reference

| Command | Description | Example |
|---------|-------------|---------|
| `envx init [--mode random\|password]` | Generate encryption key | `envx init --mode password` |
| `envx encrypt <file> [--output path]` | Encrypt .env file | `envx encrypt .env.production` |
| `envx decrypt <file>` | Decrypt to stdout (WARNING: visible) | `envx decrypt .envx \| grep API_KEY` |
| `envx show <file>` | Display as JSON | `envx show .envx \| jq .DATABASE_URL` |
| `envx run -- <command>` | Run with decrypted env | `envx run -- node server.js` |
| `envx verify <file>` | Check file integrity | `envx verify production.envx` |
| `envx check <file> [--schema]` | Validate against schema | `envx check .envx --schema schema.json` |
| `envx export-vars <file>` | Export as shell statements | `eval "$(envx export-vars .envx)"` |
| `envx rotate <new-key>` | Rotate encryption key | `envx rotate .envx.key.new --envx .envx` |

### Common Options

- `--key <path>`: Custom key file path (default: `.envx.key`)
- `--envx <path>`: Custom encrypted file path (default: `.envx`)
- `--output <path>`: Custom output path for encryption

## Library Usage (Node.js)

```typescript
import { Envx } from 'envx';

// Initialize with key file
const envx = new Envx('.envx.key');

// Generate random key
await envx.init('random');

// Or derive from password
const password = Buffer.from('your-secure-password', 'utf8');
await envx.init('password', password);

// Encrypt environment file
const encrypted = await envx.encrypt('.env');
console.log(`Encrypted ${Object.keys(encrypted.values).length} variables`);

// Decrypt to object
const secrets = await envx.decrypt('.envx');
console.log(secrets.DATABASE_URL);

// Verify file
const { valid, details } = envx.verify('.envx');
if (!valid) {
  throw new Error(`Invalid file: ${details}`);
}
```

## .envx File Format

The encrypted file is JSON with this structure:

```json
{
  "version": 1,
  "cipher": "aes-256-gcm",
  "kdf": {
    "type": "none",
    "salt": null,
    "params": null
  },
  "nonce_map": {
    "DATABASE_URL": "R7x3K9mP1vQ2...",
    "API_KEY": "F2n8L4pT6wE9..."
  },
  "values": {
    "DATABASE_URL": "aB3dF6hJ9kL0...",
    "API_KEY": "xY1zC4vB7nM2..."
  },
  "meta": {
    "created_at": "2024-12-10T17:30:00.000Z"
  }
}
```

### Format Specifications

- **version**: File format version (currently 1)
- **cipher**: Always `aes-256-gcm` (authenticated encryption)
- **kdf**: Key derivation metadata (type: `none`, `argon2id`, or `scrypt`)
- **nonce_map**: Base64-encoded 96-bit nonces (unique per variable)
- **values**: Base64-encoded ciphertext (format: `[16-byte tag][ciphertext]`)
- **meta**: Optional metadata (creation time, comments, etc.)

## GitHub Actions Example

```yaml
name: Deploy
on: [push]

env:
  ENVX_KEY: ${{ secrets.ENVX_KEY }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install envx
        run: npm install -g envx
      
      - name: Decrypt secrets
        run: |
          echo "$ENVX_KEY" > .envx.key
          envx export-vars .envx >> $GITHUB_ENV
          rm .envx.key
      
      - name: Deploy application
        run: npm run deploy
        # DATABASE_URL and API_KEY are now in environment
```

## Security Model

### Cryptographic Design

**Encryption:**
- Algorithm: AES-256-GCM (NIST-approved AEAD)
- Key Size: 256 bits (32 bytes)
- Nonce: 96 bits (12 bytes), randomly generated per value
- Authentication Tag: 128 bits (16 bytes), prevents tampering
- Implementation: Node.js `crypto` module (OpenSSL-backed)

**Key Derivation (password mode):**
- Primary: Argon2id (PHC winner, 2015)
  - Memory: 64 MB (resists GPU attacks)
  - Iterations: 3 (time cost)
  - Parallelism: 1 thread
  - Salt: 128 bits, random
- Fallback: scrypt (N=32768, r=8, p=1)

### Threat Model

**Assumptions:**
1. Encryption key is stored securely (password manager, vault, HSM)
2. Key is distributed through secure out-of-band channel
3. Workstation/CI environment is not compromised
4. Git repository may be public or leaked

**Attack Scenarios:**

| Scenario | Protected? | Mitigation |
|----------|-----------|------------|
| Accidental `.env` commit | Yes | Encrypted file is safe to commit |
| Repository leak/public | Yes | Ciphertext is useless without key |
| Weak password | Yes | Argon2id makes brute-force impractical |
| Data tampering | Yes | Auth tag verification catches changes |
| Key compromise | No | Attacker can decrypt everything |
| Memory dump | No | Key/plaintext may be in RAM |
| Malicious CI | No | CI has key and can exfiltrate |

### Best Practices

1. **Key Management:**
   - Use random keys for teams (not passwords)
   - Store keys in password managers (1Password, Bitwarden)
   - Rotate keys periodically (quarterly recommended)
   - Never commit keys to Git (add `.envx.key` to `.gitignore`)

2. **Access Control:**
   - Limit who has the encryption key
   - Use separate keys for dev/staging/production
   - Audit key access regularly

3. **Operational Security:**
   - Use `envx run` instead of decrypting to files
   - Delete plaintext files immediately after encryption
   - Enable debug logging only in development (`ENVX_DEBUG=1`)
   - Review `.envx` diffs carefully before committing

4. **Key Rotation:**
   ```bash
   # Rotate key safely
   envx rotate .envx.key.new
   # Update team/CI with new key
   # Verify: envx verify .envx
   # Delete old key: shred -u .envx.key.old
   ```

## Comparison to Alternatives

| Feature | envx | git-crypt | Blackbox | SOPS | Vault |
|---------|------|-----------|----------|------|-------|
| No external deps | Yes | No (gpg) | No (gpg) | No (kms) | No (server) |
| Per-value encryption | Yes | No | No | Yes | N/A |
| Authenticated encryption | Yes | No | No | Yes | Yes |
| TypeScript API | Yes | No | No | No | Yes |
| Transparent Git | No | Yes | Yes | No | No |
| Key rotation | Yes | No | No | Yes | Yes |
| Self-hosted | Yes | Yes | Yes | Yes | Partial |

## Troubleshooting

**"Key file not found"**
```bash
# Generate new key
envx init

# Or specify custom path
envx encrypt .env --key /path/to/key
```

**"Decryption failed: wrong key, tampered data, or file corruption"**
- Wrong key file (verify you have the correct key)
- File was manually edited (re-encrypt from original `.env`)
- Disk corruption (restore from backup)

**"Invalid key length: expected 32 bytes, got X bytes"**
- Key file is corrupted
- Wrong file specified (must be output of `envx init`)
- Re-generate key and re-encrypt

**"Password cannot be empty"**
- Press Enter after typing password
- Ensure stdin is connected (doesn't work in some CI contexts)
- Use random mode instead: `envx init` (no password)

**Debug logging:**
```bash
# Enable detailed logs
export ENVX_DEBUG=1
envx encrypt .env
```

## Development

```bash
# Clone repository
git clone https://github.com/semicolon-systems/envx.git
cd envx

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

## Documentation

- [Security Policy](./docs/SECURITY.md) - Threat model and vulnerability reporting
- [Contributing Guide](./docs/CONTRIBUTING.md) - Development workflow and standards
- [Architecture](./docs/ARCHITECTURE.md) - Technical design and implementation
- [Changelog](./docs/CHANGELOG.md) - Version history and breaking changes

## License

MIT © [Semicolon Systems](https://github.com/semicolon-systems)

See [LICENSE](./LICENSE) for full text.

## Security Contact

Found a security vulnerability? Please report responsibly via GitHub Issues or see [SECURITY.md](./docs/SECURITY.md) for our disclosure policy.

**Do not** open public issues for security concerns.

## Contributing

Contributions welcome! Please read [CONTRIBUTING.md](./docs/CONTRIBUTING.md) first.

Key areas for contribution:
- Additional KDF algorithms (e.g., Balloon, Catena)
- Hardware key support (YubiKey, TPM)
- Multi-recipient encryption (multiple keys)
- Key backup/recovery mechanisms
- Performance optimizations

## Acknowledgments

- Argon2 algorithm: [Password Hashing Competition (2015)](https://github.com/P-H-C/phc-winner-argon2)
- AES-GCM: NIST SP 800-38D
- Inspired by: SOPS, git-crypt, Blackbox

---

**Star us on GitHub if you find this useful**
