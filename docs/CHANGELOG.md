# Changelog

## [Unreleased]

- Web UI for key management
- Cloud storage backends (S3, GCS)
- Hardware security key support

## [1.0.1] - 2025-12-10

### Fixed
- Key rotation now properly re-encrypts data with new key
- Better CLI error messages and help text
- Improved argument parsing for run command

### Added
- Comprehensive inline documentation
- Detailed usage examples for common scenarios
- Better logging throughout

## [1.0.0] - 2025-01-01

Initial release with:

- XChaCha20-Poly1305 authenticated encryption
- Argon2id password-based key derivation (scrypt fallback)
- CLI for encrypt, decrypt, show, run, rotate, verify
- Library API with TypeScript types
- JSON format with schema validation
- Full test coverage
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
