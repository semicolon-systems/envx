# Changelog

All notable changes to envx are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned

- [ ] Web UI for key management
- [ ] S3/GCS backend support
- [ ] Hardware key support (YubiKey, TPM)
- [ ] Multi-recipient encryption
- [ ] Key rotation logging

## [1.0.0] - 2025-01-01

### Added

- Initial release
- XChaCha20-Poly1305 AEAD encryption
- Argon2id key derivation (with scrypt fallback)
- CLI commands:
  - `envx init`: Initialize project with random or password-based key
  - `envx encrypt`: Encrypt .env file to .envx
  - `envx decrypt`: Decrypt .envx file to stdout
  - `envx show`: Display decrypted values (no disk write)
  - `envx run`: Execute command with decrypted env vars
  - `envx rotate`: Rotate encryption key
  - `envx verify`: Verify .envx file integrity
  - `envx check`: Validate against JSON schema
  - `envx export-vars`: Export as shell variables (GitHub Actions compatible)
- Library API (`Envx` class)
- .envx JSON format with schema validation
- Full test suite (KDF, encryption, format)
- Documentation:
  - User guide (README.md)
  - Security policy (SECURITY.md)
  - Contributing guidelines (CONTRIBUTING.md)
  - Architecture documentation (ARCHITECTURE.md)
- GitHub Actions CI pipeline
- ESLint + Prettier enforcement
- MIT license

### Security

- All cryptographic operations use authenticated encryption
- Sensitive buffers are wiped after use
- No plaintext secrets persisted to disk by default
- Format validation prevents downgrade attacks
- Per-value nonces enable secure random generation

---

## Upgrade Guide

### v0.x → v1.0.0

No previous versions exist. This is the initial release.

---

**Note:** Releases follow Semantic Versioning. Breaking changes will increment the MAJOR version. Security fixes will be released promptly.

For security disclosures, see [SECURITY.md](./SECURITY.md).
