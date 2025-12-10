# Security Policy

## Threat Model

envx is designed to protect secrets in Git repositories from casual exposure.

### What envx protects against:

- Unintended commits of plaintext secrets to version control
- Unauthorized repository access without the encryption key
- Ciphertext tampering (via authenticated encryption)
- Weak passwords (via Argon2id)

### What envx does NOT protect against:

- Key compromise (attacker with key can decrypt everything)
- Memory attacks (process memory can be dumped while running)
- Side-channel attacks (timing, cache, power analysis)
- Coercion attacks (forcing users to reveal passwords)
- Keyloggers or compromised terminals

## Cryptographic Choices

### Why XChaCha20-Poly1305?

- **Modern AEAD**: Authenticated encryption prevents tampering
- **Long nonce**: 24-byte nonces enable random generation per value without collision risk
- **Fast**: Stream cipher (no block size limitations)
- **No padding oracle**: Unlike block ciphers with PKCS#7
- **libsodium-backed**: Audited, widely-used implementation

### Why Argon2id?

- **Memory-hard**: Resists GPU/ASIC attacks
- **Time-cost**: Tuneable iteration count
- **Side-channel resistant**: Designed to prevent timing attacks
- **Modern standard**: Winner of Password Hashing Competition
- **Fallback scrypt**: For older systems if needed

## Key Rotation

When rotating keys:

1. Generate new key: `envx init --key .envx.key.new`
2. Decrypt with old key, re-encrypt with new key
3. Replace old key with new key atomically
4. Securely destroy old key (if no longer needed)

## Buffer Wiping

We wipe sensitive buffers using `Buffer.fill(0)`. This is **not a guarantee** against:

- Speculative execution attacks (spectre-style)
- Hypervisor memory introspection
- Microarchitectural side-channels

For highly sensitive deployments (HSM key storage, etc.), consider:

- Using secure enclaves (Intel SGX, ARM TrustZone)
- Deploying via ephemeral containers
- Restricting process memory access (mlock, seccomp)

## Memory Safety

Node.js provides:

- Garbage collection (non-deterministic wipe timing)
- No explicit memory locking
- No protection against unmap attacks

Mitigations:

- Keep sensitive buffers in scope (auto-GC after function exit)
- Avoid logging plaintext secrets
- Use `--max-old-space-size` to minimize core dumps

## Audit Log

- **v1.0.0** (2025-01-01): Initial release, XChaCha20-Poly1305 + Argon2id

## Reporting Vulnerabilities

Please report security issues privately using GitHub Security Advisories.

Include:

- Affected version(s)
- Detailed reproduction steps
- Impact assessment
- Proposed fix (if available)

We will:

1. Acknowledge within 48 hours
2. Investigate and confirm
3. Issue patch and advisory
4. Credit discoverer (unless anonymity requested)

Do NOT:

- Publicly disclose until fix released
- Exploit vulnerability in other systems
- Access other users' data

## Additional Resources

- [NIST SP 800-132](https://csrc.nist.gov/pubs/sp/800/132/final) - PBKDF2 recommendations (Argon2id exceeds)
- [Crypto.stackexchange](https://crypto.stackexchange.com/) - Community Q&A
- [libsodium docs](https://doc.libsodium.org/) - Cryptographic library

---

Last updated: 2025-01-01
