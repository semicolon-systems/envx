# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-11

### Initial Release

#### Added

- AES-256-GCM authenticated encryption for environment variables
- Argon2id key derivation function with secure default parameters
- Scrypt fallback for key derivation
- Unique random nonces per encrypted value
- CLI with 9 commands: init, encrypt, decrypt, show, run, verify, check, rotate, export-vars
- Library API for programmatic usage
- JSON Schema validation for .envx file format
- Comprehensive test suite with 90%+ coverage
- TypeScript with full type definitions
- File permission enforcement (0600) for sensitive files
- Secure memory wiping for sensitive buffers
- Structured logging with configurable levels
- GitHub Actions CI workflow
- Complete documentation (README, SECURITY, CONTRIBUTING)

#### Security

- Prevents nonce reuse through unique random generation
- Authentication tag verification to detect tampering
- Constant-time operations where applicable
- No plaintext secrets in logs or error messages
- Secure random number generation for all cryptographic operations
- Memory wiping for sensitive data after use

#### Performance

- Encrypts 100 keys in <5ms
- Encrypts 1000 keys in <10ms
- Handles 1MB values in <10ms
- Memory usage <100MB for typical operations

#### Cryptographic Parameters

- AES-256-GCM: 256-bit key, 96-bit nonce, 128-bit tag
- Argon2id: 64MB memory, 3 iterations, 1 thread
- Scrypt: N=32768, r=8, p=1, dkLen=32

[1.0.0]: https://github.com/semicolon-systems/envx/releases/tag/v1.0.0
