# Contributing to envx

**Version 1.0 | Last Updated: 2024-12-10**

Thank you for your interest in contributing to envx! We welcome contributions from the community and are grateful for any help improving the project.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Code Standards](#code-standards)
5. [Testing Guidelines](#testing-guidelines)
6. [Documentation](#documentation)
7. [Adding New Features](#adding-new-features)
8. [Security Considerations](#security-considerations)
9. [Release Process](#release-process)
10. [Getting Help](#getting-help)

## Code of Conduct

### Our Standards

- **Be Respectful:** Treat all contributors with respect and kindness
- **Be Professional:** Keep discussions focused on technical merit
- **Be Inclusive:** Welcome contributors of all backgrounds and experience levels
- **Be Constructive:** Provide actionable feedback, not criticism

### Unacceptable Behavior

- Harassment, discrimination, or personal attacks
- Trolling, inflammatory comments, or derailing discussions
- Publishing others' private information without permission
- Any conduct which could reasonably be considered inappropriate

**Enforcement:** Violations may result in temporary or permanent ban from the project.

## Getting Started

### Prerequisites

- **Node.js:** Version 18 or higher
- **npm:** Version 9 or higher
- **Git:** Version 2.x or higher
- **OS:** macOS, Linux, or Windows (WSL2 recommended)

### Initial Setup

```bash
# 1. Fork the repository on GitHub
# Click "Fork" button at https://github.com/semicolon-systems/envx

# 2. Clone your fork
git clone https://github.com/YOUR-USERNAME/envx.git
cd envx

# 3. Add upstream remote
git remote add upstream https://github.com/semicolon-systems/envx.git

# 4. Install dependencies
npm install

# 5. Build the project
npm run build

# 6. Run tests to verify setup
npm test

# 7. Run linter
npm run lint
```

**Expected Output:**
```
- TypeScript compilation successful
- 14 tests passing
- No lint errors
```

### Project Structure Quick Reference

```
envx/
├── src/
│   ├── cli/          # Command-line interface
│   ├── lib/          # Public API (Envx class)
│   ├── crypto/       # Encryption/KDF primitives
│   ├── format/       # .envx file parsing/validation
│   ├── utils/        # Logger, errors, memory utils
│   └── index.ts      # Main export
├── test/             # Test suites (Vitest)
├── docs/             # Documentation
├── examples/         # Usage examples
└── dist/             # Compiled output (generated)
```

## Development Workflow

### Branching Strategy

We follow a simplified Git Flow model:

```bash
# Feature branches
git checkout -b feature/add-yubikey-support

# Bug fix branches
git checkout -b fix/mac-verification-edge-case

# Documentation updates
git checkout -b docs/update-security-policy

# Refactoring (no behavior change)
git checkout -b refactor/simplify-kdf-interface
```

**Branch Naming:**
- `feature/` - New functionality
- `fix/` - Bug fixes
- `docs/` - Documentation only
- `refactor/` - Code restructuring
- `test/` - Test improvements
- `chore/` - Maintenance tasks

### Keeping Your Fork Updated

```bash
# Fetch latest changes from upstream
git fetch upstream

# Merge upstream main into your fork
git checkout main
git merge upstream/main

# Push to your fork
git push origin main
```

### Making Changes

```bash
# 1. Create branch from updated main
git checkout -b feature/your-feature

# 2. Make changes and test iteratively
npm run build && npm test

# 3. Commit changes (see commit guidelines below)
git add .
git commit -m "feat(crypto): add hardware key support"

# 4. Push to your fork
git push origin feature/your-feature

# 5. Open pull request on GitHub
```

### Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

**Format:**
```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style (formatting, missing semicolons, etc.)
- `refactor` - Code change that neither fixes bug nor adds feature
- `perf` - Performance improvements
- `test` - Adding or correcting tests
- `chore` - Maintenance tasks (dependencies, build config)

**Scopes:**
- `cli` - Command-line interface
- `crypto` - Cryptographic operations
- `format` - File format handling
- `lib` - Library API
- `utils` - Utilities (logger, errors, memory)
- `deps` - Dependency updates

**Examples:**

```
feat(crypto): add ChaCha20-Poly1305 cipher support

Implement ChaCha20-Poly1305 as alternative to AES-256-GCM for
environments without hardware AES acceleration. Maintains backward
compatibility with existing .envx files.

Closes #127
```

```
fix(cli): handle empty .env files gracefully

Previously, encrypting an empty .env file would throw an error.
Now it creates a valid .envx file with no values.

Fixes #145
```

```
docs(security): clarify threat model boundaries

Expand documentation on what envx does and does not protect against.
Add real-world attack scenarios and mitigation strategies.
```

### Pull Request Process

**Before Submitting:**

1. All tests pass: `npm test`
2. Code builds successfully: `npm run build`
3. Linter passes: `npm run lint`
4. Code formatted: `npm run format`
5. Documentation updated (if adding features)
6. Tests added (if changing behavior)

**PR Title Format:**
```
<type>(<scope>): <description>
```

**PR Description Template:**
```markdown
## What does this PR do?

Brief explanation of changes.

## Why is this needed?

Problem being solved or feature being added.

## How was this tested?

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed

## Breaking changes?

Yes/No - If yes, explain migration path.

## Related issues

Closes #123
Relates to #456
```

**Review Process:**

1. Automated checks run (CI)
2. Maintainer review (typically within 3 business days)
3. Address feedback via additional commits
4. Once approved, maintainer will merge
5. Delete your branch after merge

## Code Standards

### TypeScript

**Strict Mode:** All code must compile with `strict: true` in `tsconfig.json`

**Naming Conventions:**
```typescript
// Classes: PascalCase
class EnvxManager { }

// Interfaces/Types: PascalCase
interface EncryptionResult { }
type KdfType = 'argon2id' | 'scrypt';

// Functions: camelCase
function encryptValues(data: Record<string, string>): void { }

// Constants: UPPER_SNAKE_CASE
const NONCE_LENGTH = 12;

// Private class members: _camelCase (discouraged, use TypeScript private)
private keyCache?: Buffer;

// File names: kebab-case
// envx-format.ts, export-vars.ts
```

**Type Safety:**
```typescript
// DO: Use explicit types
function decrypt(ciphertext: Buffer, key: Buffer): Buffer {
  // ...
}

// DON'T: Use 'any'
function decrypt(ciphertext: any, key: any): any {
  // ...
}

// DO: Use strict null checks
function findKey(keyPath?: string): Buffer | null {
  // ...
}

// DON'T: Ignore potential nulls
function findKey(keyPath: string): Buffer {
  return fs.readFileSync(keyPath);  // Crashes if file missing
}
```

**Error Handling:**
```typescript
// DO: Use custom error types
if (!validKey) {
  throw new MissingKeyError('.envx.key');
}

// DO: Provide context in errors
try {
  decrypt(ciphertext, key);
} catch (error) {
  throw new DecryptionError(`Failed to decrypt ${filePath}: ${error.message}`);
}

// DON'T: Swallow errors silently
try {
  decrypt(ciphertext, key);
} catch (error) {
  // silent failure
}
```

### ESLint and Prettier

**Configuration:** `.eslintrc.json` and `.prettierrc`

**Running Checks:**
```bash
# Check linting
npm run lint

# Auto-fix linting issues
npm run lint -- --fix

# Check formatting
npx prettier --check .

# Auto-format all files
npm run format
```

**Key Rules:**
- 2-space indentation
- Single quotes for strings
- No semicolons (ASI)
- Trailing commas in multiline
- Maximum line length: 100 characters (flexible)

### Security-Sensitive Code

**Buffer Handling:**
```typescript
// DO: Wipe sensitive buffers
let key: Buffer | null = null;
try {
  key = fs.readFileSync('.envx.key');
  // ... use key ...
} finally {
  if (key) wipeBuffer(key);
}

// DON'T: Leave sensitive data in memory
const key = fs.readFileSync('.envx.key');
// ... use key without cleanup ...
```

**Logging:**
```typescript
// DO: Sanitize logs
logger.info('encryption_complete', { file: '.envx', count: 10 });

// DON'T: Log secrets
logger.info('encrypted', { DATABASE_URL: 'postgres://...' });
```

**Validation:**
```typescript
// DO: Validate all inputs
if (key.length !== KEY_LENGTH) {
  throw new ValidationError(`Invalid key length: expected ${KEY_LENGTH}, got ${key.length}`);
}

// DON'T: Trust user input
const key = fs.readFileSync(keyPath);  // What if file is empty?
```

## Testing Guidelines

### Test Framework

We use [Vitest](https://vitest.dev/) for unit and integration tests.

**Running Tests:**
```bash
# Run all tests
npm test

# Watch mode (re-run on file changes)
npm run test:watch

# Run specific test file
npx vitest test/crypto.test.ts

# Run with coverage report
npx vitest --coverage
```

### Writing Tests

**Test Structure:**
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Feature Name', () => {
  // Setup before each test
  beforeEach(() => {
    // Create test fixtures
  });
  
  // Cleanup after each test
  afterEach(() => {
    // Remove temporary files
  });
  
  it('should handle normal case', () => {
    // Arrange
    const input = createTestInput();
    
    // Act
    const result = functionUnderTest(input);
    
    // Assert
    expect(result).toBe(expectedValue);
  });
  
  it('should handle edge case', () => {
    // ...
  });
  
  it('should throw error for invalid input', () => {
    expect(() => functionUnderTest(invalidInput)).toThrow(ValidationError);
  });
});
```

**Coverage Expectations:**

| Component | Target Coverage |
|-----------|----------------|
| Crypto | 100% |
| Format | 100% |
| Library | 95% |
| CLI | 85% |
| Utils | 90% |

**Test Categories:**

**1. Unit Tests** (isolated functions)
```typescript
it('should derive key using Argon2id', async () => {
  const password = Buffer.from('test_password', 'utf8');
  const salt = crypto.randomBytes(16);
  
  const key = await deriveKeyArgon2id(password, salt);
  
  expect(key).toHaveLength(32);
  expect(Buffer.isBuffer(key)).toBe(true);
});
```

**2. Integration Tests** (multiple components)
```typescript
it('should encrypt and decrypt round-trip', async () => {
  const envx = new Envx();
  await envx.init('random');
  
  await envx.encrypt('test.env');
  const decrypted = await envx.decrypt('.envx');
  
  expect(decrypted.API_KEY).toBe('test_value');
});
```

**3. Security Tests** (attack scenarios)
```typescript
it('should reject tampered ciphertext', async () => {
  const envx = new Envx();
  await envx.init('random');
  await envx.encrypt('test.env');
  
  // Tamper with encrypted file
  const content = JSON.parse(fs.readFileSync('.envx', 'utf8'));
  content.values.API_KEY = modifyCiphertext(content.values.API_KEY);
  fs.writeFileSync('.envx', JSON.stringify(content));
  
  // Should throw DecryptionError (MAC verification failure)
  await expect(envx.decrypt('.envx')).rejects.toThrow(DecryptionError);
});
```

**4. Edge Case Tests**
```typescript
it('should handle empty .env file', async () => {
  fs.writeFileSync('empty.env', '');
  
  const envx = new Envx();
  await envx.init('random');
  const result = await envx.encrypt('empty.env');
  
  expect(Object.keys(result.values)).toHaveLength(0);
});

it('should handle very long values (>1 MB)', async () => {
  const longValue = 'A'.repeat(1024 * 1024);  // 1 MB
  fs.writeFileSync('test.env', `LONG_VALUE=${longValue}`);
  
  const envx = new Envx();
  await envx.init('random');
  await envx.encrypt('test.env');
  const decrypted = await envx.decrypt('.envx');
  
  expect(decrypted.LONG_VALUE).toBe(longValue);
});
```

## Documentation

### Documentation Standards

All user-facing features must be documented:

1. **README.md** - User guide, quick start, common use cases
2. **ARCHITECTURE.md** - Technical design, data flows, module structure
3. **SECURITY.md** - Threat model, cryptographic choices, best practices
4. **CONTRIBUTING.md** - This file
5. **Code Comments** - Complex logic, security considerations, algorithm choices

### Inline Documentation

**Function/Method Comments:**
```typescript
/**
 * Encrypt environment variables using AES-256-GCM.
 * 
 * Each value is encrypted with a unique random nonce to prevent
 * nonce reuse attacks. The ciphertext includes a 128-bit authentication
 * tag for tamper detection.
 * 
 * @param values - Plaintext key-value pairs to encrypt
 * @param key - 256-bit encryption key (32 bytes)
 * @returns Object containing nonce_map and encrypted values
 * @throws {ValidationError} If key length is not 32 bytes
 * 
 * @example
 * const encrypted = encryptValues(
 *   { API_KEY: 'secret' },
 *   Buffer.from('...32 bytes...')
 * );
 */
export function encryptValues(
  values: Record<string, string>,
  key: Buffer
): EncryptionResult {
  // ...
}
```

**Complex Logic Comments:**
```typescript
// Split encrypted value into [tag || ciphertext]
// Format: First 16 bytes = GCM authentication tag
//         Remaining bytes = actual ciphertext
const tag = encrypted.subarray(0, TAG_LENGTH);
const ciphertext = encrypted.subarray(TAG_LENGTH);
```

**Security Considerations:**
```typescript
// SECURITY: Nonce must be unique per encryption to prevent
// catastrophic nonce reuse. We use crypto.randomBytes() which
// provides cryptographically secure random values from OS entropy.
const nonce = crypto.randomBytes(NONCE_LENGTH);
```

## Adding New Features

### Feature Development Checklist

- [ ] **Design Discussion:** Open GitHub issue describing feature
- [ ] **API Design:** Define interfaces and types
- [ ] **Implementation:** Write code following standards
- [ ] **Tests:** Add comprehensive test coverage
- [ ] **Documentation:** Update README, ARCHITECTURE, examples
- [ ] **Examples:** Add usage example in `examples/`
- [ ] **Changelog:** Add entry to CHANGELOG.md
- [ ] **Backward Compatibility:** Ensure no breaking changes (or document migration)

### Example: Adding New Cipher

**Step 1:** Create module `src/crypto/chacha20.ts`
```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const NONCE_LENGTH = 12;  // 96 bits for ChaCha20-Poly1305
const TAG_LENGTH = 16;     // 128 bits

export function encryptWithChaCha20(
  values: Record<string, string>,
  key: Buffer
): EncryptionResult {
  // Implementation...
}

export function decryptWithChaCha20(
  nonce_map: Record<string, string>,
  encrypted_values: Record<string, string>,
  key: Buffer
): Record<string, string> {
  // Implementation...
}
```

**Step 2:** Update `src/format/schema.json`
```json
{
  "properties": {
    "cipher": {
      "enum": ["aes-256-gcm", "chacha20-poly1305"]
    }
  }
}
```

**Step 3:** Update `src/lib/envx.ts` to support new cipher
```typescript
async encrypt(envPath: string, cipher: 'aes-256-gcm' | 'chacha20-poly1305' = 'aes-256-gcm') {
  // ...
  if (cipher === 'chacha20-poly1305') {
    result = encryptWithChaCha20(parsed, key);
  } else {
    result = encryptValues(parsed, key);
  }
  // ...
}
```

**Step 4:** Add tests `test/chacha20.test.ts`
```typescript
describe('ChaCha20-Poly1305', () => {
  it('should encrypt and decrypt', () => { /* ... */ });
  it('should detect tampering', () => { /* ... */ });
});
```

**Step 5:** Update documentation
- README.md: Add CLI flag `--cipher chacha20-poly1305`
- ARCHITECTURE.md: Explain cipher choice and performance characteristics
- SECURITY.md: Document security properties

**Step 6:** Add example `examples/chacha20/README.md`

## Security Considerations

### Reporting Security Vulnerabilities

**DO NOT** open public GitHub issues for security vulnerabilities.

**Instead:**
1. Create a private security advisory on GitHub
2. Include detailed description and reproduction steps
3. Allow 48 hours for acknowledgment
4. Allow 30 days for patch before public disclosure

### Security Review Checklist

Before submitting crypto-related changes, verify:

- [ ] No hardcoded secrets (keys, passwords, tokens)
- [ ] All sensitive buffers wiped after use
- [ ] No secrets logged (even in debug mode)
- [ ] Input validation on all untrusted data
- [ ] Error messages don't leak secrets
- [ ] Constant-time comparisons for crypto (where applicable)
- [ ] Random values from CSPRNG (crypto.randomBytes)
- [ ] No weak algorithms (MD5, SHA1, DES, RC4)

### Cryptographic Changes

**High-Risk Changes:**
- Modifying encryption/decryption logic
- Changing key derivation parameters
- Adding new cipher algorithms
- Altering nonce generation

**Required:**
- Peer review from maintainer with cryptography background
- Formal security analysis (threat model update)
- Comprehensive test coverage (including attack scenarios)

## Release Process

**Note:** This section is for maintainers only.

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR:** Incompatible API changes (v1.0.0 → v2.0.0)
- **MINOR:** Backward-compatible functionality (v1.0.0 → v1.1.0)
- **PATCH:** Backward-compatible bug fixes (v1.0.0 → v1.0.1)

### Release Checklist

- [ ] All tests passing: `npm test`
- [ ] Build successful: `npm run build`
- [ ] Lint passing: `npm run lint`
- [ ] Documentation updated
- [ ] CHANGELOG.md updated with release notes
- [ ] Version bumped in `package.json`
- [ ] Git tag created: `git tag vX.Y.Z`
- [ ] Published to npm: `npm publish`
- [ ] GitHub release created with notes

### Changelog Format

```markdown
## [1.2.0] - 2024-12-15

### Added
- Hardware key support (YubiKey, TPM)
- Multi-recipient encryption
- JSON output mode for `envx show`

### Changed
- Improved error messages in CLI
- Updated Argon2id default parameters (memory: 64MB → 128MB)

### Fixed
- MAC verification edge case with empty values
- Incorrect file permissions on Windows

### Security
- Patched timing attack in key comparison (CVE-2024-12345)
```

## Common Issues and Solutions

### Build Errors

**Error:** `Cannot find module './crypto'`
```bash
# Solution: Ensure all imports use relative paths
# import { encrypt } from './crypto';
# import { encrypt } from 'crypto';
```

**Error:** `TS2345: Argument of type 'X' is not assignable to parameter of type 'Y'`
```bash
# Solution: Check TypeScript strict mode compliance
npm run build -- --verbose
```

### Test Failures

**Error:** Tests pass locally but fail in CI
```bash
# Possible causes:
# 1. Node version mismatch (CI uses Node 20)
node --version

# 2. Environment variables
printenv | grep ENVX

# 3. Timing-sensitive tests (use longer timeouts in CI)
it('async operation', async () => { /* ... */ }, 10000);  // 10s timeout
```

**Error:** `EACCES: permission denied`
```bash
# File permission issue - check test cleanup
afterEach(() => {
  fs.chmodSync('test-file', 0o666);  // Reset permissions
  fs.unlinkSync('test-file');
});
```

### Lint Failures

**Error:** `Unexpected trailing comma`
```bash
# Auto-fix with Prettier
npm run format

# Or manually remove trailing commas in single-line objects
```

**Error:** `'variable' is assigned a value but never used`
```bash
# Solution: Remove unused variable or prefix with underscore
const _unused = getValue();  // Explicitly marked as intentionally unused
```

## Getting Help

### Resources

- **Documentation:** [docs/](./docs/)
- **Examples:** [examples/](../examples/)
- **Issues:** [GitHub Issues](https://github.com/semicolon-systems/envx/issues)
- **Discussions:** [GitHub Discussions](https://github.com/semicolon-systems/envx/discussions)

### Contact

- **General Questions:** Open GitHub Discussion
- **Bug Reports:** Open GitHub Issue (include reproduction steps)
- **Feature Requests:** Open GitHub Issue (explain use case)
- **Security Issues:** GitHub Security Advisory

### Response Times

- **Security issues:** 48 hours
- **Bug reports:** 3-5 business days
- **Feature requests:** 1-2 weeks
- **Pull requests:** 3-5 business days

---

**Thank you for contributing to envx!**

Your contributions make this project better for everyone. Whether you're fixing a typo, adding a feature, or improving documentation, every contribution is valued.
