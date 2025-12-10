# envx v1.0.1 Release

## Project Description

envx is a secure environment variable manager that lets you safely commit encrypted secrets to Git. Built with Node.js and TypeScript, it uses industry-standard AES-256-GCM encryption and Argon2id key derivation to protect sensitive configuration data.

Unlike traditional .env files that can't be version controlled safely, envx encrypts each variable individually with authenticated encryption, making it perfect for teams who want to keep secrets alongside their code without risk.

## Key Benefits

- **Version Control Friendly** - Commit encrypted .envx files directly to Git
- **Strong Security** - AES-256-GCM with Argon2id password hashing
- **Easy Integration** - Works as CLI tool or Node.js library
- **CI/CD Ready** - Native GitHub Actions support, works with any CI system
- **Zero Config** - Simple commands, sensible defaults
- **Type Safe** - Full TypeScript support with exported types

## Use Cases

- Share secrets across development teams via Git
- Rotate API keys without manually updating every developer's machine
- Keep staging and production configs in the same repository
- Audit secret changes through Git history
- Onboard new developers without Slack/email secret sharing

## Installation

```bash
npm install -g envx-secure
```

## Quick Example

```bash
# One-time setup
envx init
envx encrypt .env

# Daily usage
envx show .envx          # View secrets
envx run -- npm start    # Run with secrets loaded
```

## LinkedIn Announcement

---

🔐 Announcing envx v1.0.1 - Secure Environment Variables for Git

After months of development, I'm excited to release envx, an open-source tool for safely committing secrets to version control.

The problem: .env files can't be committed to Git. Secrets get shared via Slack, email, or password managers, making team coordination painful. New developers spend hours collecting API keys. Rotating credentials means notifying everyone individually.

The solution: envx encrypts each environment variable with AES-256-GCM before commit. Your team versions secrets alongside code, with Git providing audit trails and rollback. Only team members with the encryption key can decrypt.

Key features:
• Strong crypto: AES-256-GCM + Argon2id
• CLI + Node.js library
• GitHub Actions integration
• Key rotation support
• TypeScript types included

Perfect for:
• Development teams sharing config
• CI/CD pipelines needing secrets
• Multi-environment deployments
• Anyone tired of "can you send me the API keys?" messages

Built with security in mind - authenticated encryption detects tampering, memory wiping prevents leaks, and schema validation ensures file integrity.

Try it: npm install -g envx-secure
Docs: https://github.com/semicolon-systems/envx

Open source, MIT licensed. Contributions welcome!

#opensource #nodejs #security #devtools #typescript

---

## Technical Highlights

### Architecture
- Modular design with separate crypto, logging, and validation layers
- Comprehensive error handling with custom error types
- Memory-safe buffer wiping after cryptographic operations
- JSON Schema validation for file format integrity

### Security
- Per-value random nonces prevent replay attacks
- Authenticated encryption with Galois/Counter Mode
- Password-based key derivation with memory-hard Argon2id
- Constant-time operations via Node.js crypto module

### Developer Experience
- Self-contained CLI with no external dependencies
- Detailed error messages with actionable suggestions
- Full TypeScript types for IDE autocomplete
- Comprehensive test coverage (14/14 passing)
- Example projects for common use cases

## What's New in v1.0.1

- Fixed key rotation to properly re-encrypt data
- Added comprehensive usage examples (basic, GitHub Actions, multi-env)
- Improved error messages and CLI help text
- Better documentation throughout
- Cleaner modular architecture

## Future Roadmap

- Web UI for key management
- Cloud storage backends (S3, GCS)
- Hardware security key support (YubiKey)
- Multi-recipient encryption
- Terraform/Pulumi provider

## Credits

Built by Semicolon Systems with contributions from the open-source community.

Special thanks to the maintainers of argon2, libsodium, and commander.js.

## Links

- GitHub: https://github.com/semicolon-systems/envx
- npm: https://www.npmjs.com/package/envx-secure
- Documentation: https://github.com/semicolon-systems/envx#readme
- Security Policy: https://github.com/semicolon-systems/envx/blob/main/docs/SECURITY.md
