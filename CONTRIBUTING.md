# Contributing to envx

Thank you for considering contributing to envx. This document provides guidelines and instructions for contributing.

## Code of Conduct

Be respectful, professional, and constructive. Harassment or discriminatory behavior will not be tolerated.

## Development Setup

### Prerequisites

- Node.js 18.x or later
- npm 9.x or later
- Git

### Initial Setup

```bash
git clone https://github.com/semicolon-systems/envx.git
cd envx
npm install
npm run build
npm test
```

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Make your changes
4. Run tests and linting
5. Commit with clear messages
6. Push and create a pull request

## Project Structure

```
envx/
├── src/
│   ├── cli/           # CLI commands
│   ├── crypto/        # Encryption, decryption, KDF
│   ├── format/        # .envx format and validation
│   ├── lib/           # Main Envx class
│   ├── utils/         # Utilities (errors, logging, memory)
│   └── types/         # TypeScript type definitions
├── test/              # Test files
├── dist/              # Compiled output (git-ignored)
└── docs/              # Additional documentation
```

## Development Commands

```bash
npm run build         # Compile TypeScript
npm test             # Run test suite
npm run test:watch   # Run tests in watch mode
npm run lint         # Run ESLint
npm run format       # Check formatting with Prettier
npm run format:fix   # Fix formatting issues
npm audit            # Check for vulnerabilities
```

## Coding Standards

### TypeScript

- Use strict TypeScript settings
- Provide explicit return types for public functions
- Avoid `any` type unless absolutely necessary
- Use interfaces for public contracts
- Document complex type definitions

### Code Style

- Use Prettier for formatting (automatic)
- Follow ESLint rules (enforced in CI)
- Maximum line length: 100 characters
- Use descriptive variable and function names
- Prefer `const` over `let`, avoid `var`

### Comments

- Explain **why**, not what
- Document non-obvious design decisions
- Note security considerations
- Explain cryptographic choices
- Document assumptions and invariants

**Good comments:**
```typescript
// Nonce must be unique for each encryption to prevent attacks
const nonce = randomBytes(12);

// Using Argon2id for resistance to both GPU and side-channel attacks
const { key } = await deriveKeyArgon2id(password);
```

**Bad comments:**
```typescript
// Create a nonce
const nonce = randomBytes(12);

// Call the function
const result = await someFunction();
```

### Naming Conventions

- Functions: `camelCase`
- Classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE` or `camelCase` for const objects
- Private members: prefix with `_` (optional)
- Test files: `*.test.ts`

### Error Handling

- Use custom error classes from `utils/errors.ts`
- Provide meaningful error messages
- Include context in error options
- Never expose sensitive data in errors
- Log errors appropriately

```typescript
throw new DecryptionError('Failed to decrypt value', {
  cause: originalError,
  context: { key: name },
});
```

### Logging

- Use the logger from `utils/logger.ts`
- Never log secrets, keys, or plaintext values
- Use appropriate log levels:
  - `debug`: Detailed operational information
  - `info`: Normal operational milestones
  - `warn`: Unexpected but handled situations
  - `error`: Failures requiring attention

**Never log:**
- Encryption keys
- Decrypted values
- Passwords
- Authentication tags
- Nonces (except for debugging in non-production)

## Testing

### Test Requirements

- All new features must have tests
- Bug fixes should include regression tests
- Aim for 90%+ code coverage
- Test both success and failure paths

### Test Categories

1. **Unit tests**: Test individual functions in isolation
2. **Integration tests**: Test component interactions
3. **Security tests**: Test cryptographic properties and error handling
4. **CLI tests**: Test command-line interface

### Writing Tests

Use Vitest framework:

```typescript
import { describe, it, expect } from 'vitest';

describe('Feature name', () => {
  it('should behave correctly', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = myFunction(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```

### Running Specific Tests

```bash
npm test -- test/crypto.test.ts
npm test -- --grep "encryption"
```

## Security

### Security-Critical Code

Special care required for:
- Anything in `src/crypto/`
- Key generation and storage
- Memory handling for sensitive data
- Input validation
- Error messages

### Security Review Process

Changes to cryptographic code require:
1. Detailed explanation of the change
2. Security rationale
3. Test coverage for security properties
4. Review by a maintainer with security expertise

### Reporting Security Issues

Do NOT open public issues for security vulnerabilities.

Email: security@semicolon-systems.com

See [SECURITY.md](SECURITY.md) for details.

## Pull Request Process

### Before Submitting

- [ ] All tests pass (`npm test`)
- [ ] No linting errors (`npm run lint`)
- [ ] Code is formatted (`npm run format`)
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] Documentation updated if needed
- [ ] CHANGELOG.md updated (if applicable)
- [ ] Commits are clear and atomic

### PR Description

Include:
- What the PR does
- Why the change is needed
- How you tested it
- Any breaking changes
- Related issue numbers

### Review Process

1. Automated checks must pass (CI)
2. At least one maintainer approval required
3. Security-sensitive changes need additional review
4. Address all feedback before merge

## Commit Messages

Use clear, descriptive commit messages:

```
feat: add support for environment-specific keys
fix: prevent nonce reuse in concurrent encryption
docs: update security best practices
test: add integration tests for key rotation
chore: update dependencies
```

### Commit Message Format

```
<type>: <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, no code change
- `refactor`: Code restructuring
- `test`: Adding or fixing tests
- `chore`: Maintenance tasks

## Release Process

(For maintainers only)

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Run full test suite
4. Create git tag
5. Push tag to trigger CI release
6. Verify npm publication
7. Create GitHub release with notes

## Documentation

### README.md

Keep examples up-to-date and tested. All code samples must work as shown.

### API Documentation

Document all public APIs with:
- Purpose and behavior
- Parameters and types
- Return values
- Exceptions thrown
- Usage examples

### Architecture Documentation

Update `ARCHITECTURE.md` when making structural changes.

## Questions and Support

- **Bugs**: Open a GitHub issue
- **Feature requests**: Open a GitHub discussion
- **Security**: Email security@semicolon-systems.com
- **Other**: Open a GitHub discussion

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Recognition

Contributors will be acknowledged in release notes and the README if they wish.
