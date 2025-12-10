# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

## Cryptographic Design

### Encryption

envx uses AES-256-GCM (Galois/Counter Mode) for authenticated encryption:

- **Algorithm**: AES-256-GCM
- **Key size**: 256 bits (32 bytes)
- **Nonce size**: 96 bits (12 bytes)
- **Tag size**: 128 bits (16 bytes)
- **Nonce generation**: Cryptographically secure random per value
- **Nonce reuse**: Prevented by unique random generation for each encryption

AES-GCM provides both confidentiality and authenticity. The authentication tag detects any tampering with ciphertext or metadata.

### Key Derivation

For password-based keys, envx uses Argon2id:

- **Algorithm**: Argon2id (hybrid mode resistant to both side-channel and GPU attacks)
- **Memory cost**: 65536 KB (64 MB)
- **Time cost**: 3 iterations
- **Parallelism**: 1 thread
- **Salt**: 128-bit random
- **Output**: 256-bit key

Scrypt is available as fallback:

- **Algorithm**: scrypt
- **Cost parameter (N)**: 32768 (2^15)
- **Block size (r)**: 8
- **Parallelization (p)**: 1
- **Salt**: 128-bit random
- **Output**: 256-bit key

### Random Number Generation

All random values (keys, nonces, salts) use Node.js `crypto.randomBytes()`, which provides cryptographically secure randomness from the operating system.

## Security Guarantees

envx provides the following security properties:

1. **Confidentiality**: Encrypted values cannot be read without the correct key
2. **Integrity**: Tampering with encrypted files is detected via authentication tags
3. **Authentication**: GCM mode ensures ciphertext authenticity
4. **Nonce uniqueness**: Each value uses a unique random nonce

## Security Limitations

envx does NOT protect against:

1. **Key compromise**: If `.envx.key` is leaked, all encrypted data can be decrypted
2. **Weak passwords**: Short or common passwords in password-based mode are vulnerable to brute force
3. **Runtime attacks**: Memory dumps, debuggers, or malicious code can access decrypted values at runtime
4. **Offline brute force**: Argon2id parameters balance security and performance but do not prevent determined offline attacks on weak passwords
5. **Side channels**: Implementation does not protect against timing attacks or power analysis
6. **Quantum computers**: AES-256 and Argon2id do not provide post-quantum security

## Threat Model

### In Scope

envx protects against:

- Accidental commit of plaintext secrets to version control
- Unauthorized access to encrypted `.envx` files without key
- Detection of tampering with encrypted data
- Basic protection of keys derived from passwords

### Out of Scope

envx does NOT protect against:

- Attackers with access to decryption key
- Malicious code running in the same process
- Physical access to running systems
- Social engineering attacks
- Supply chain attacks on dependencies
- Nation-state adversaries with quantum computing capabilities

## Best Practices

### Key Management

1. **Never commit** `.envx.key` to version control
2. **Use random keys** in production (not password-based)
3. **Rotate keys** periodically (every 90-180 days)
4. **Backup keys** to secure offline storage
5. **Use separate keys** for each environment (dev, staging, prod)
6. **Set file permissions** to 0600 for key files
7. **Use environment variables** or secrets managers in CI/CD, not files

### Password Selection

If using password-based keys:

1. Minimum 12 characters
2. Include uppercase, lowercase, numbers, symbols
3. Avoid dictionary words, names, dates
4. Use a password manager
5. Never reuse passwords
6. Consider using a passphrase (4+ random words)

### Operational Security

1. **Audit access** to encrypted files and keys
2. **Monitor** for unauthorized decryption attempts
3. **Rotate keys** after personnel changes
4. **Use MFA** for systems storing keys
5. **Encrypt backups** of key files
6. **Log** decryption operations in production

### Development Workflow

1. Add `.envx.key` to `.gitignore`
2. Use `envx run` instead of decrypting to disk
3. Never print or log decrypted values
4. Use separate keys for development and production
5. Review `.envx` diffs carefully before committing

## Reporting Vulnerabilities

We take security seriously and appreciate responsible disclosure.

### How to Report

Please open a GitHub Security Advisory on the repository.

### What to Include

1. Description of the vulnerability
2. Steps to reproduce
3. Potential impact
4. Suggested mitigation (if any)
5. Your contact information

### Response Timeline

- **Initial response**: Within 48 hours
- **Triage**: Within 7 days
- **Fix timeline**: Depends on severity
  - Critical: 7-14 days
  - High: 14-30 days
  - Medium: 30-60 days
  - Low: 60-90 days
- **Public disclosure**: After fix is released and users have time to update (typically 30 days)

### Scope

In scope vulnerabilities:

- Cryptographic implementation flaws
- Authentication bypasses
- Key or secret leaks
- Encryption oracle attacks
- Nonce reuse issues
- Memory safety issues
- Command injection
- Path traversal
- Dependency vulnerabilities

Out of scope:

- Social engineering
- Physical attacks
- Denial of service
- Issues requiring MITM position
- Previously known issues with documented workarounds

### Bounty

We do not currently offer a bug bounty program, but we will acknowledge security researchers in release notes and our security hall of fame.

## Security Updates

Security updates are released as patch versions (e.g., 1.0.1, 1.0.2) and announced via:

- GitHub Security Advisories
- npm advisory database
- Release notes
- GitHub Security Advisories

## Dependencies

envx relies on well-audited cryptographic libraries:

- `argon2`: Argon2 password hashing (C binding)
- Node.js `crypto` module: AES-GCM, scrypt, random generation

We monitor dependencies for vulnerabilities via:

- GitHub Dependabot
- npm audit
- Snyk scanning

## Compliance

envx cryptography aligns with:

- NIST recommendations for AES-256-GCM
- OWASP password storage guidelines
- RFC 9106 (Argon2)
- Industry best practices for authenticated encryption

envx is NOT:

- FIPS 140-2 certified
- Common Criteria certified
- Formally verified
- Audited by third-party security firms

## Security Changelog

### Version 1.0.0

- Initial release with AES-256-GCM and Argon2id
- Unique random nonces per value
- Authentication tag verification
- File permission enforcement

## Questions

For security questions that don't require private disclosure, open a GitHub Discussion in the Security category.

For security questions, please use the GitHub Security Advisory process.
