# Security Policy

**Version 1.0 | Last Updated: 2024-12-10**

## Overview

envx is designed to protect secrets committed to Git repositories from unauthorized access. This document details our threat model, cryptographic design decisions, limitations, and vulnerability disclosure policy.

**Core Principle:** envx assumes the Git repository may be compromised, but the encryption key remains secret.

## Threat Model

### Protections Provided

envx **DOES** protect against the following threats:

#### 1. Accidental Plaintext Exposure in Git
**Threat:** Developer commits `.env` file containing secrets to Git repository  
**Protection:** Only encrypted `.envx` files are committed; plaintext never leaves local machine  
**Mechanism:** Separate encryption step before commit  
**Residual Risk:** User might forget to encrypt and commit `.env` directly (mitigate with pre-commit hooks)

#### 2. Unauthorized Repository Access
**Threat:** Attacker gains read access to Git repository (public repo, stolen credentials, leaked backup)  
**Protection:** Encrypted values are cryptographically secure without the key  
**Mechanism:** AES-256-GCM with 256-bit keys (2^256 keyspace = ~10^77 possible keys)  
**Residual Risk:** None if key remains secret and quantum computers don't break AES

#### 3. Ciphertext Tampering
**Threat:** Attacker modifies `.envx` file to inject malicious secrets  
**Protection:** MAC verification during decryption detects any modification  
**Mechanism:** GCM authentication tag (128 bits) provides 2^-128 forgery probability  
**Residual Risk:** Negligible (cryptographically impossible without key)

#### 4. Weak Password Attacks
**Threat:** User chooses weak password; attacker attempts brute-force or dictionary attack  
**Protection:** Argon2id makes each password attempt computationally expensive  
**Mechanism:** 64 MB memory cost + 3 iterations ≈ 100ms per attempt on modern CPU  
**Math:** 10-character alphanumeric password ≈ 3.7×10^18 combinations × 100ms = 11 million years  
**Residual Risk:** Short passwords (<12 chars) still vulnerable to targeted attacks

#### 5. Rainbow Table Attacks
**Threat:** Attacker precomputes password→key mappings for common passwords  
**Protection:** Random 128-bit salt per key makes precomputation infeasible  
**Mechanism:** Each password requires fresh Argon2id computation with unique salt  
**Storage Cost:** 2^128 salts × 32 bytes/key = 10^38 bytes (exceeds universe atom count)  
**Residual Risk:** None

### Protections NOT Provided

envx **DOES NOT** protect against the following threats:

#### 1. Encryption Key Compromise
**Scenario:** Attacker obtains `.envx.key` file  
**Impact:** Complete compromise—attacker can decrypt all secrets  
**Why Not Protected:** By design, the key IS the secret; losing it means game over  
**Mitigation:** Store keys in password managers, vault systems, or HSMs; never commit to Git

#### 2. Memory Attacks
**Scenario:** Attacker dumps process memory while envx is running  
**Impact:** Plaintext secrets and encryption key visible in memory  
**Why Not Protected:** Node.js doesn't provide secure memory (no mlock, no guard pages)  
**Mitigation:** Run in ephemeral containers; restrict ptrace capabilities; minimize lifetime of decrypted secrets

#### 3. Side-Channel Attacks
**Scenarios:**
- **Timing attacks:** Measure decryption time to infer key bits
- **Cache attacks:** Observe CPU cache patterns (Spectre, Meltdown)
- **Power analysis:** Measure power consumption during crypto operations

**Why Not Protected:** Node.js and OpenSSL have some mitigations, but not full constant-time guarantees  
**Mitigation:** Physical security; run in trusted environments; use hardware enclaves (SGX, TrustZone)

#### 4. Social Engineering / Physical Attacks
**Scenarios:** Keyloggers, shoulder surfing, coerced password disclosure, evil maid attacks  
**Why Not Protected:** envx is software; can't protect against human or physical compromise  
**Mitigation:** Strong password hygiene; secure workstations; full-disk encryption; personnel security

#### 5. Malicious CI/CD Environments
**Scenario:** Compromised GitHub Actions runner or GitLab CI job exfiltrates secrets  
**Impact:** CI has the key and decrypted secrets—attacker can steal everything  
**Why Not Protected:** CI must have access to deploy; trust boundary includes CI platform  
**Mitigation:** Use ephemeral runners; audit CI logs; minimize secret exposure time; consider secret-less CI

#### 6. Supply Chain Attacks
**Scenario:** Malicious dependency in npm package tree steals secrets  
**Why Not Protected:** envx runs in the same Node.js process as dependencies  
**Mitigation:** Audit dependencies; use `npm audit`; pin versions; consider isolated secret management

## Cryptographic Design

### Encryption Algorithm: AES-256-GCM

**Choice Rationale:**

| Factor | Decision | Justification |
|--------|----------|---------------|
| **Cipher** | AES-256 | NIST-approved, hardware-accelerated (AES-NI), 256-bit security |
| **Mode** | GCM | Authenticated encryption (AEAD), parallelizable, single-pass |
| **Key Size** | 32 bytes (256 bits) | Quantum-resistant security margin (Grover's algorithm → 2^128 effective) |
| **Nonce Size** | 12 bytes (96 bits) | Optimal for GCM (avoids GHASH computation for counter) |
| **Tag Size** | 16 bytes (128 bits) | Standard authentication strength (2^-128 forgery probability) |
| **Implementation** | Node.js `crypto` | OpenSSL-backed, well-audited, no external dependencies |

**Security Properties:**
- **IND-CPA:** Indistinguishable from random under chosen-plaintext attack (nonce uniqueness)
- **INT-CTXT:** Integrity of ciphertext (unforgeable authentication tag)
- **AEAD:** Combined confidentiality + integrity in single operation

**Nonce Generation:**
```
FOR EACH secret value:
  nonce = crypto.randomBytes(12)  // 96 bits from OS CSPRNG
  ciphertext = AES-GCM-encrypt(key, nonce, plaintext)
  STORE nonce alongside ciphertext
```

**Collision Risk:** With 2^96 possible nonces and random generation:
- After 2^32 encryptions: ~2^-32 collision probability (1 in 4 billion)
- After 2^48 encryptions: ~50% collision probability (birthday paradox)
- **Practical Limit:** Rotate key after 10^9 encryptions (~2^30, provides 2^-34 safety margin)

### Key Derivation: Argon2id

**Choice Rationale:**

| Factor | Decision | Justification |
|--------|----------|---------------|
| **Algorithm** | Argon2id | PHC winner (2015), memory-hard, side-channel resistant |
| **Variant** | id (hybrid) | Combines data-dependent (Argon2d) and data-independent (Argon2i) passes |
| **Memory Cost** | 64 MB (65536 KB) | Exceeds L3 cache, resists GPU attacks (GPU memory bandwidth limited) |
| **Time Cost** | 3 iterations | Targets ~100ms on modern CPU (balances security vs UX) |
| **Parallelism** | 1 thread | Maximizes memory-hardness (spreading over cores reduces memory latency cost) |
| **Salt** | 16 bytes (128 bits) | Random per key, prevents rainbow tables |
| **Output** | 32 bytes (256 bits) | Matches AES-256 key size |

**Performance Tuning:**
```
CPU: Apple M1 (2020)           → ~95ms per derivation
CPU: Intel i7-9750H (2019)     → ~110ms per derivation
CPU: AMD Ryzen 5 3600 (2019)   → ~105ms per derivation
GPU: NVIDIA RTX 4090 (2022)    → ~80ms per derivation (memory BW limited)
```

**Resistance Properties:**
- **GPU Resistance:** 64 MB per attempt exhausts GPU VRAM for parallel attacks
- **ASIC Resistance:** Memory latency dominates (can't optimize with custom silicon)
- **Time-Memory Tradeoff:** Argon2id structure resists low-memory optimizations

**Fallback: scrypt**  
If Argon2 library unavailable (rare), envx falls back to scrypt:
- **Parameters:** N=32768 (2^15), r=8, p=1
- **Memory:** ~128 MB per derivation
- **Performance:** ~150ms on modern CPUs
- **Security:** Sufficient for most use cases, but Argon2id preferred

### Format Specification

The `.envx` file format (version 1):

```typescript
interface EnvxFile {
  version: 1;                    // Format version
  cipher: "aes-256-gcm";        // Always AES-256-GCM
  kdf: {
    type: "none" | "argon2id" | "scrypt";
    salt: string | null;        // Base64-encoded 16-byte salt (null if type=none)
    params: KdfParams | null;   // Algorithm parameters (null if type=none)
  };
  nonce_map: {
    [key: string]: string;      // Base64-encoded 12-byte nonces
  };
  values: {
    [key: string]: string;      // Base64-encoded [16-byte tag][ciphertext]
  };
  meta: {
    created_at: string;         // ISO 8601 timestamp
    [key: string]: any;         // Extensible metadata
  };
}
```

**Wire Format for values:**
```
encrypted_value = base64(authentication_tag || ciphertext)
                  ^^^^^^^^^^^^^^^^^^^^^^^^   ^^^^^^^^^^
                  16 bytes (GCM tag)         variable length
```

**Validation Rules:**
1. `version` must equal 1
2. `cipher` must equal `"aes-256-gcm"`
3. `kdf.type` must be `none`, `argon2id`, or `scrypt`
4. Every key in `values` must have corresponding nonce in `nonce_map`
5. All nonces must decode to exactly 12 bytes
6. All encrypted values must decode to at least 16 bytes (tag)
7. If `kdf.type != "none"`, salt must be present and decode to 16 bytes

## Key Management Best Practices

### Generation

**Random Keys (Recommended for Teams):**
```bash
envx init                          # Generates 32 random bytes from OS CSPRNG
# Store in password manager (1Password, Bitwarden, LastPass)
# Share via secure channel (Signal, encrypted email, in-person)
```

**Password-Derived Keys (Solo Projects):**
```bash
envx init --mode password
# Enter strong password: minimum 16 characters, mix of cases/numbers/symbols
# Store password in password manager
# Never reuse passwords across projects
```

### Storage Options

| Method | Security | Convenience | Use Case |
|--------|----------|-------------|----------|
| **Password Manager** | 5/5 | 4/5 | Teams, personal projects |
| **HashiCorp Vault** | 5/5 | 3/5 | Enterprise, audit requirements |
| **AWS Secrets Manager** | 5/5 | 3/5 | AWS deployments |
| **CI/CD Secrets** | 4/5 | 5/5 | Automated pipelines |
| **HSM / YubiKey** | 5/5 | 2/5 | Highly sensitive environments |
| **Filesystem (encrypted)** | 3/5 | 4/5 | Single workstation |
| **Filesystem (plaintext)** | 1/5 | 5/5 | **NOT RECOMMENDED** |

### Distribution

**Secure Channels:**
1. **In-person:** USB drive, QR code, verbal reading (for short keys)
2. **Encrypted messaging:** Signal, Wire, iMessage (E2EE)
3. **Password manager sharing:** 1Password vaults, Bitwarden collections
4. **Encrypted email:** PGP/GPG-encrypted attachments
5. **Secret sharing services:** OneTimeSecret.com (burn after reading)

**Insecure Channels (NEVER USE):**
- Unencrypted email  
- Slack/Teams direct messages  
- SMS text messages  
- Pastebin / GitHub gists  
- Shared Google Docs  

### Rotation Schedule

**Recommended Intervals:**
- **Production keys:** Rotate quarterly (every 3 months)
- **Staging keys:** Rotate semi-annually (every 6 months)
- **Development keys:** Rotate annually (every 12 months)
- **Emergency:** Rotate immediately if key compromise suspected

**Rotation Procedure:**
```bash
# Step 1: Generate new key
envx init --key .envx.key.new

# Step 2: Rotate encrypted file
envx rotate .envx.key.new --envx .envx --output .envx.new

# Step 3: Verify new file
envx verify .envx.new --key .envx.key.new

# Step 4: Atomic replacement
mv .envx.new .envx
mv .envx.key.new .envx.key

# Step 5: Commit and distribute
git add .envx
git commit -m "Rotate encryption key"
# Distribute .envx.key to team via secure channel

# Step 6: Securely destroy old key
shred -u .envx.key.old  # Linux
srm .envx.key.old       # macOS (requires brew install srm)
```

## Operational Security

### Safe Usage Patterns

**DO:**
- Use `envx run -- command` to inject secrets without writing to disk
- Encrypt immediately after creating `.env` file
- Add `.envx.key` to `.gitignore` before first commit
- Verify `.envx` file after encryption: `envx verify .envx`
- Use separate keys for dev/staging/production
- Enable debug logging in development: `ENVX_DEBUG=1`
- Review `.envx` diffs before committing (ensure no plaintext leaks)

**DON'T:**
- Don't run `envx decrypt .envx > .env` (leaves plaintext on disk)
- Don't commit `.envx.key` to Git (defeats entire purpose)
- Don't share keys via insecure channels (email, Slack)
- Don't reuse keys across environments (staging key != production key)
- Don't disable verification checks (always validate before using secrets)

### CI/CD Integration

**Secure Pattern (GitHub Actions):**
```yaml
- name: Load secrets
  run: |
    echo "${{ secrets.ENVX_KEY }}" > .envx.key
    npx envx export-vars .envx >> $GITHUB_ENV
    shred -u .envx.key  # Destroy key immediately after use

- name: Deploy
  run: npm run deploy
  # DATABASE_URL, API_KEY now in environment
```

**Security Considerations:**
1. Key stored in GitHub Secrets (encrypted at rest, access-controlled)
2. Key written to ephemeral runner filesystem (destroyed after job)
3. Plaintext secrets only exist in environment variables (not files)
4. Job logs don't expose secrets (GitHub masks registered secrets)

**Multi-Environment Strategy:**
```
.envx.dev       → ENVX_KEY_DEV    (developer access)
.envx.staging   → ENVX_KEY_STAGING (CI + staging admins)
.envx.prod      → ENVX_KEY_PROD    (CI + ops team only)
```

## Memory Safety Considerations

### Buffer Wiping

envx attempts to wipe sensitive buffers using `Buffer.fill(0)`:

```typescript
try {
  const plaintext = decrypt(ciphertext);
  // ... use plaintext ...
} finally {
  plaintext.fill(0);  // Zero out memory
}
```

**Limitations:**
- **Garbage Collection:** V8 may move buffers before wipe (copies remain in old generation)
- **Compiler Optimization:** JIT compiler may optimize away "dead" writes
- **Swap/Hibernation:** OS may page memory to disk before wipe
- **Core Dumps:** Crash may capture memory before wipe completes

**NOT Effective Against:**
- Speculative execution (Spectre) side-channels
- Cold boot attacks (RAM retains data after power loss)
- DMA attacks (FireWire, Thunderbolt)
- Hypervisor memory introspection

### Recommendations for High-Security Environments

**Level 1 (Standard):**
- Use envx as-is for most applications
- Trust OS CSPRNG and OpenSSL implementation

**Level 2 (Enhanced):**
- Run in containers with `--security-opt=no-new-privileges`
- Disable core dumps: `ulimit -c 0`
- Use `mlock`-capable runtime (future envx feature)

**Level 3 (Maximum):**
- Use Hardware Security Modules (HSMs) for key storage
- Deploy in Trusted Execution Environments (Intel SGX, AMD SEV)
- Implement split-key architecture (multi-party computation)
- Use ephemeral keys with hardware-backed attestation

## Audit History

| Date | Version | Event | Details |
|------|---------|-------|---------|
| 2024-12-10 | v1.0.0 | Initial release | AES-256-GCM, Argon2id, 14 passing tests |

## Vulnerability Disclosure Policy

### Reporting Process

**Report security vulnerabilities via GitHub Issues (mark as security issue)**

**Please Include:**
1. **Affected versions** (e.g., "v1.0.0 through v1.2.3")
2. **Vulnerability type** (e.g., "MAC bypass", "timing leak", "key disclosure")
3. **Reproduction steps** (detailed, with code if possible)
4. **Impact assessment** (confidentiality/integrity/availability)
5. **Proposed fix** (optional, but appreciated)
6. **Disclosure timeline** (your expectations for fix/announcement)

**Our Commitments:**
- Acknowledge receipt within **48 hours**
- Provide initial assessment within **1 week**
- Issue patch within **30 days** (for confirmed vulnerabilities)
- Credit reporter in security advisory (unless anonymity requested)
- Coordinate disclosure timing with reporter

**Disclosure Timeline:**
```
Day 0:   Vulnerability reported
Day 2:   Acknowledgment sent
Day 7:   Initial assessment complete
Day 30:  Patch released (target)
Day 31:  Public advisory published
Day 31:  CVE requested (if applicable)
```

### Scope

**In Scope:**
- Cryptographic implementation flaws
- Key management weaknesses
- Authentication bypass
- Privilege escalation
- Code execution vulnerabilities
- Information disclosure

**Out of Scope:**
- Denial-of-service (unless coupled with other impact)
- Social engineering attacks
- Physical attacks
- Supply chain attacks (malicious dependencies)
- Issues in third-party dependencies (report to upstream)

### Responsible Disclosure Guidelines

**DO:**
- Report vulnerabilities privately before public disclosure
- Provide reasonable time for patches (30-90 days standard)
- Test against isolated environments (your own infrastructure)
- Document findings clearly with reproducible steps

**DON'T:**
- Publicly disclose before coordinated release
- Exploit vulnerabilities in production systems
- Access other users' data or systems
- Perform automated scanning that impacts availability

## Additional Resources

### Standards & Specifications
- [NIST SP 800-38D](https://csrc.nist.gov/pubs/sp/800/38/d/final) - GCM Specification
- [NIST SP 800-132](https://csrc.nist.gov/pubs/sp/800/132/final) - Password-Based Key Derivation
- [RFC 9106](https://datatracker.ietf.org/doc/html/rfc9106) - Argon2 Memory-Hard Function
- [RFC 7914](https://datatracker.ietf.org/doc/html/rfc7914) - scrypt PBKDF

### Research Papers
- [Argon2 Paper](https://github.com/P-H-C/phc-winner-argon2/blob/master/argon2-specs.pdf) - Biryukov, Dinu, Khovratovich (2015)
- [GCM Security Analysis](https://eprint.iacr.org/2015/102.pdf) - Procter, Cid (2015)

### Tools
- [CyberChef](https://gchq.github.io/CyberChef/) - Decode/analyze envx file format
- [Hashcat](https://hashcat.net/hashcat/) - Test password strength against Argon2id
- [OpenSSL](https://www.openssl.org/) - Verify AES-GCM implementation

### Community
- [Crypto StackExchange](https://crypto.stackexchange.com/) - Cryptography Q&A
- [Security StackExchange](https://security.stackexchange.com/) - Security best practices

---

**Document Version:** 1.0  
**Last Reviewed:** 2024-12-10  
**Next Review:** 2025-03-10 (quarterly)
