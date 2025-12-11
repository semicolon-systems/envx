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

### Encryption

- Algorithm: AES-256-GCM (AEAD)
- Key size: 256 bits
- Nonce size: 96 bits (12 bytes), generated per value to prevent reuse
- Authentication tag: 128 bits (16 bytes)

AES-GCM is a well-understood, widely available AEAD cipher that provides confidentiality and integrity. Using a unique random 12-byte nonce per value prevents nonce reuse attacks.

### Key Derivation: Argon2id and scrypt

We use Argon2id as the primary KDF and scrypt as an optional fallback when Argon2 is unavailable.

- Argon2id (recommended): memory=65536 KB, time=3, parallelism=1
- scrypt (fallback): N=32768, r=8, p=1, dkLen=32

Both choices are tuned for reasonable performance while providing resistance to GPU and ASIC attacks. Argon2id provides additional resistance to side-channel attacks.

## Key Rotation

Key rotation should be performed carefully to avoid leaving plaintext or duplicates of keys:

1. Initialize a new key file using `envx init --key <new-key-path>` (created with 0600 permissions).
2. Use `envx rotate` to re-encrypt the `.envx` file with the new key.
3. Verify the rotated file and replace the old key atomically.
4. Securely delete the old key file when it is no longer needed.

## Buffer Wiping

We wipe sensitive in-memory buffers using `Buffer.fill(0)` to reduce the window in which secrets exist in memory. This is a mitigation, not a guarantee — it cannot protect against:

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

- **v1.0.0** (2025-01-01): Initial release — AES-256-GCM + Argon2id

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
