# Changelog

All notable changes to envx are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Under Consideration

- **Multi-recipient encryption:** Different keys for different team members (Hybrid encryption with ECIES)
- **Hardware key support:** YubiKey HMAC-SHA1 challenge-response, TPM 2.0 integration
- **Key splitting:** Shamir Secret Sharing for N-of-M recovery
- **Audit logging:** Track who decrypted which secrets when
- **Cloud backends:** Encrypted backup to S3/GCS/Azure Blob
- **Web UI:** Browser-based decryption tool (client-side crypto)
- **Plugin architecture:** Custom KDF/cipher implementations
- **Key rotation logging:** Automatic key rotation scheduling and tracking

## [1.0.0] - 2024-12-10

**Initial public release**

### Added

#### Core Cryptography
- **AES-256-GCM encryption:** NIST-approved authenticated encryption with associated data (AEAD)
- **Argon2id KDF:** Memory-hard password-based key derivation (64 MB, 3 iterations)
- **scrypt KDF fallback:** Compatibility layer for environments without Argon2 (N=2^15, r=8, p=1)
- **Per-value nonces:** Unique 96-bit random nonces prevent nonce reuse attacks
- **MAC authentication:** 128-bit GCM authentication tags detect tampering

#### CLI Commands
- `envx init [--mode random|password]` - Generate encryption keys
  - Random mode: 256-bit key from OS CSPRNG
  - Password mode: Argon2id-derived key with 128-bit salt
- `envx encrypt <file> [--output path] [--key path]` - Encrypt `.env` → `.envx`
  - Quote-aware parsing (handles `KEY="value"`, `KEY='value'`)
  - Inline comment stripping
  - Automatic file permission control (0600)
- `envx decrypt <file> [--key path]` - Decrypt to stdout (with security warnings)
- `envx show <file> [--key path] [--json]` - Display decrypted values
  - JSON output mode for programmatic access
- `envx run [--key path] [--envx path] -- <command>` - Execute with injected env
  - Proper signal forwarding (SIGINT, SIGTERM)
  - Exit code propagation
- `envx rotate <new-key> [--envx path] [--output path]` - Re-encrypt with new key
  - Four-step safe rotation process
  - Integrity verification before/after
- `envx verify <file> [--key path]` - Integrity check
  - JSON parsing validation
  - Schema compliance
  - MAC verification for all values
- `envx check <file> [--schema path]` - Custom schema validation
  - JSON Schema Draft-07 support
- `envx export-vars <file> [--key path]` - Export as `KEY=VALUE` lines
  - Shell-safe escaping
  - GitHub Actions compatible (`>> $GITHUB_ENV`)

#### Library API
- **Envx class:** High-level TypeScript API
  - `init(mode, password?)` - Key generation
  - `encrypt(envPath, outputPath?)` - File encryption
  - `decrypt(envxPath)` - Decryption to object
  - `verify(envxPath)` - Integrity verification
  - `rotate(newKeyPath, envxPath, outputPath?)` - Key rotation
- **Structured logging:** Security-aware logger (never logs secrets)
  - Debug mode: `ENVX_DEBUG=1`
  - JSON-structured output for log aggregation
- **Custom errors:** Typed exception hierarchy
  - `ValidationError` - File format/schema issues
  - `DecryptionError` - MAC failure, wrong key, corruption
  - `KdfError` - Key derivation failures
  - `FileExistsError` - Prevent accidental overwrite
  - `MissingKeyError` - Key file not found

#### File Format
- **`.envx` JSON specification:** Version 1
  - `version`: Format version (currently 1)
  - `cipher`: Algorithm identifier (`aes-256-gcm`)
  - `kdf`: Key derivation metadata (type, salt, params)
  - `nonce_map`: Base64-encoded nonces (unique per value)
  - `values`: Base64-encoded `[tag||ciphertext]`
  - `meta`: Extensible metadata (creation timestamp, etc.)
- **JSON Schema validation:** Strict format enforcement
  - Type checking, required fields, value constraints
  - Prevents malformed files from being processed

#### Testing
- **14 comprehensive tests:** 3 test suites covering:
  - Crypto operations (KDF, encrypt, decrypt, MAC verification)
  - Format parsing and validation
  - Library integration (Envx class methods)
- **Vitest framework:** Fast, TypeScript-native test runner
- **Edge case coverage:**
  - Empty files
  - Tampered ciphertext (MAC verification)
  - Wrong keys
  - Corrupted JSON

#### Documentation
- **README.md:** User guide with quick start, CLI reference, GitHub Actions examples
- **SECURITY.md:** Comprehensive threat model
  - What envx protects against (accidental leaks, unauthorized access, tampering, weak passwords)
  - What envx does NOT protect against (key compromise, memory attacks, side-channels)
  - Cryptographic design rationale
  - Key management best practices
  - Vulnerability disclosure policy
- **ARCHITECTURE.md:** Technical deep-dive
  - Module structure and data flow diagrams
  - Encryption/decryption workflows with ASCII art
  - KDF parameter justifications
  - Security model and trust boundaries
- **CONTRIBUTING.md:** Development guidelines
  - Code standards (TypeScript strict mode, ESLint, Prettier)
  - Testing guidelines (unit, integration, security tests)
  - Commit message conventions (Conventional Commits)
  - Pull request process
- **Examples:**
  - Basic usage (`examples/basic/`)
  - GitHub Actions integration (`examples/github-actions/`)
  - Multi-environment setup (`examples/multi-env/`)

#### Tooling
- **TypeScript 5.6:** Strict mode enabled
- **ESLint:** Code quality enforcement
- **Prettier:** Consistent formatting
- **GitHub Actions CI:**
  - Automated testing on push/PR
  - Multi-platform (Linux, macOS, Windows)
  - Node.js version matrix (18, 20, 22)
- **npm package:** Published as `envx` (scoped: `@semicolon-systems/envx`)

### Security

- **Authenticated encryption:** All operations use AES-256-GCM (AEAD mode)
  - Confidentiality: 256-bit security (quantum-resistant margin with Grover's algorithm → 2^128)
  - Integrity: 128-bit authentication tag (2^-128 forgery probability)
- **Nonce uniqueness:** Random generation with 2^96 keyspace
  - Collision probability: <2^-32 after 2^30 encryptions
- **Memory protection:** Sensitive buffer wiping
  - Keys, plaintexts, nonces wiped with `Buffer.fill(0)` after use
  - Try-finally blocks ensure cleanup even on exceptions
- **Input validation:** All inputs validated before processing
  - Key length checks (must be exactly 32 bytes)
  - File existence verification
  - JSON schema enforcement
- **No plaintext leaks:** Secrets never written to disk unencrypted
  - `envx show` outputs to stdout only
  - `envx run` injects into process environment (not files)
- **Format versioning:** Prevents downgrade attacks
  - Unknown versions rejected at parse time
- **Constant-time operations:** OpenSSL-backed crypto (timing leak mitigations)

### Changed

N/A (initial release)

### Deprecated

N/A (initial release)

### Removed

N/A (initial release)

### Fixed

N/A (initial release)

---

## Versioning Policy

### Semantic Versioning

- **MAJOR (X.0.0):** Incompatible API changes
  - Examples: Removing commands, changing file format incompatibly, removing CLI flags
- **MINOR (1.X.0):** Backward-compatible functionality additions
  - Examples: New CLI commands, new library methods, new ciphers (with backward compatibility)
- **PATCH (1.0.X):** Backward-compatible bug fixes
  - Examples: Fixing edge cases, correcting documentation, performance improvements

### Security Updates

- **Critical vulnerabilities:** Patched within 48 hours (version bump: PATCH)
- **High-severity issues:** Patched within 1 week (version bump: PATCH)
- **Medium/low issues:** Included in next planned release (version bump: MINOR/PATCH)

### Backward Compatibility

- **File format:** New versions will be able to read old `.envx` files
- **CLI:** Commands will maintain backward compatibility within MAJOR versions
- **Library API:** Methods will not be removed within MAJOR versions (may be deprecated with warnings)

### Deprecation Process

1. **Announce:** Deprecation warning added to code/docs (MINOR release)
2. **Wait:** Minimum 6 months or 1 MAJOR version (whichever is longer)
3. **Remove:** Deprecated feature removed (MAJOR release)

**Example:**
```
v1.5.0 - Deprecate `--legacy-mode` flag (warning logged)
v1.6.0 - Continue supporting with warnings
v2.0.0 - Remove `--legacy-mode` flag entirely
```

---

## Migration Guides

### Upgrading from v0.x

**N/A** - v1.0.0 is the initial release. No previous versions exist.

### Future Upgrades

Migration guides will be provided in this section for MAJOR version upgrades.

---

## Release Schedule

- **Patch releases:** As needed (bug fixes, security patches)
- **Minor releases:** Quarterly (January, April, July, October)
- **Major releases:** Annually (or when breaking changes are necessary)

**Next planned release:** v1.1.0 (2025-04-01)

---

## Support Policy

- **Latest MAJOR:** Full support (new features, bug fixes, security patches)
- **Previous MAJOR:** Security patches only (6 months after new MAJOR release)
- **Older versions:** No support (upgrade recommended)

**Example Timeline:**
```
2024-12-10: v1.0.0 released (fully supported)
2025-12-10: v2.0.0 released (v1.x enters security-only support)
2026-06-10: v1.x support ends (v2.x fully supported)
```

---

## Reporting Issues

- **Bugs:** [GitHub Issues](https://github.com/semicolon-systems/envx/issues)
- **Security:** GitHub Security Advisory (private disclosure)
- **Feature Requests:** [GitHub Discussions](https://github.com/semicolon-systems/envx/discussions)

---

**For detailed security information, see [SECURITY.md](./SECURITY.md).**
