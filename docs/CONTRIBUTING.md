# Contributing to envx

Thank you for your interest in contributing to envx!

## Code of Conduct

Be respectful and professional. Discrimination, harassment, or bad-faith arguments are not tolerated.

## Getting Started

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/YOUR-USERNAME/envx.git`
3. **Install** dependencies: `npm install`
4. **Build**: `npm run build`
5. **Test**: `npm test`
6. **Lint**: `npm run lint && npm run format`

## Development Workflow

### Branching

```bash
# Main development branch
git checkout -b feature/your-feature-name

# Bug fixes
git checkout -b fix/issue-description
```

### Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Example:
```
feat(crypto): add X25519 support

Implement X25519 key agreement for future compatibility.
This allows pre-sharing keys via public channels.

Closes #123
```

### Pull Requests

1. Create descriptive PR title (include issue number if applicable)
2. Reference issue: `Fixes #123`
3. Explain what and why
4. Run tests locally: `npm test`
5. Ensure lint passes: `npm run lint`

## Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: All rules enforced
- **Prettier**: Automatic formatting

```bash
# Auto-fix formatting
npx prettier --write .

# Check lint
npm run lint
```

## Testing

- Write tests for new features
- Update tests when modifying behavior
- Aim for >90% coverage

```bash
npm test                 # Run all tests
npm run test:watch      # Watch mode
```

Test structure:
```typescript
describe('Feature name', () => {
  it('should do X', () => {
    // Arrange
    const input = ...;
    
    // Act
    const result = feature(input);
    
    // Assert
    expect(result).toBe(...);
  });
});
```

## Adding New Algorithms

To add a new cipher or KDF:

1. **Create** new module: `src/crypto/new-algo.ts`
2. **Export** from `src/crypto/index.ts`
3. **Implement** interface:
   ```typescript
   export const encryptWith NewAlgo = async (
     plaintext: Record<string, string>,
     key: Buffer
   ): Promise<EncryptionResult> => { ... }
   ```
4. **Test** thoroughly: `test/new-algo.test.ts`
5. **Update** schema: `src/format/schema.json`
6. **Bump version**: `package.json`
7. **Document**: `docs/ARCHITECTURE.md`

## Documentation

- **README.md**: User-facing guide
- **SECURITY.md**: Threat model and best practices
- **ARCHITECTURE.md**: Technical design decisions
- **CHANGELOG.md**: Version history

### Adding features to docs:

1. Update README.md with examples
2. Add CLI reference to ARCHITECTURE.md
3. Note breaking changes in CHANGELOG.md

## Release Process

(Maintainers only)

1. Update version in `package.json`
2. Update `CHANGELOG.md` with: `## [X.Y.Z] - YYYY-MM-DD`
3. Run `npm test` and `npm run build`
4. Commit: `chore: release v.X.Y.Z`
5. Tag: `git tag vX.Y.Z`
6. Push: `git push origin main && git push origin vX.Y.Z`
7. Publish: `npm publish`

GitHub Actions automatically runs:
- Linting
- Tests
- Build
- Coverage

## Common Issues

**Tests fail locally but pass in CI?**
- Check Node version: `node --version` (should be 20+)
- Clear cache: `rm -rf node_modules && npm install`
- Check env vars: `printenv | grep ENVX`

**Build fails with TypeScript errors?**
- Ensure strict mode: `npm run build -- --strict`
- Check imports use `./path` not `./path.ts`

**Lint fails?**
- Run formatter: `npx prettier --write .`
- Fix issues: `npm run lint -- --fix`

## Need Help?

- **Bugs**: Create issue with reproduction steps
- **Features**: Start discussion in Discussions tab
- **Questions**: Check existing issues first
- **Security**: Report via GitHub Security Advisories (see SECURITY.md)

---

Happy contributing! 🚀
