# GitHub Actions Integration Example

This guide demonstrates how to securely use envx to manage secrets in GitHub Actions CI/CD pipelines.

## Overview

**Problem:** Hard-coding secrets in GitHub Actions YAML files or using many individual GitHub Secrets is cumbersome.

**Solution:** Commit encrypted `.envx` file to Git, store only the encryption key in GitHub Secrets, and decrypt at runtime.

**Benefits:**
- Version control your secrets (encrypted)
- Audit trail via Git history
- Easy rotation (just update `.envx` file)
- One GitHub Secret instead of many

## Prerequisites

- envx installed locally: `npm install -g envx`
- GitHub repository with Actions enabled
- `.env` file with secrets (never commit this!)

## Step-by-Step Setup

### 1. Initialize Encryption Key

```bash
# Generate random 256-bit key
envx init

# This creates .envx.key file
ls -la .envx.key
# -rw------- 1 user staff 32 Dec 10 18:00 .envx.key
```

**Important:** The `.envx.key` file contains your encryption key. Treat it like a password.

### 2. Encrypt Your Secrets

```bash
# Create .env file with secrets
cat > .env <<EOF
DATABASE_URL=postgres://user:pass@localhost/db
API_KEY=sk_live_abc123xyz789
STRIPE_SECRET=sk_test_def456uvw012
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
EOF

# Encrypt .env → .envx
envx encrypt .env

# Verify encryption
envx verify .envx
# Valid .envx file: 5 variables

# Preview decrypted values
envx show .envx
```

### 3. Commit Encrypted File to Git

```bash
# Add .envx (encrypted, safe to commit)
git add .envx
git commit -m "Add encrypted environment variables"

# NEVER commit .envx.key or .env
echo ".envx.key" >> .gitignore
echo ".env" >> .gitignore
git add .gitignore
git commit -m "Ignore sensitive files"

git push origin main
```

### 4. Add Key to GitHub Secrets

**Via Web UI:**
1. Go to your repository on GitHub
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `ENVX_KEY`
5. Value: Paste contents of `.envx.key` file
   ```bash
   cat .envx.key | pbcopy  # macOS (copies to clipboard)
   cat .envx.key           # Linux/Windows (copy manually)
   ```
6. Click **Add secret**

**Via GitHub CLI:**
```bash
gh secret set ENVX_KEY < .envx.key
```

### 5. Create GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  # Make encryption key available to all steps
  ENVX_KEY: ${{ secrets.ENVX_KEY }}

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      # 1. Checkout code (includes .envx file)
      - name: Checkout repository
        uses: actions/checkout@v4
      
      # 2. Setup Node.js
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      # 3. Install envx
      - name: Install envx
        run: npm install -g envx
      
      # 4. Decrypt secrets and inject into environment
      - name: Setup environment variables
        run: |
          # Write key to file
          echo "$ENVX_KEY" > .envx.key
          
          # Export decrypted vars to GitHub environment
          envx export-vars .envx >> $GITHUB_ENV
          
          # Remove key file immediately (security best practice)
          shred -u .envx.key  # Linux
          # rm .envx.key      # macOS/Windows
      
      # 5. Verify secrets are available
      - name: Verify environment
        run: |
          echo "DATABASE_URL is set: $([ -n "$DATABASE_URL" ] && echo 'yes' || echo 'no')"
          echo "API_KEY is set: $([ -n "$API_KEY" ] && echo 'yes' || echo 'no')"
          # Don't print actual values!
      
      # 6. Install dependencies
      - name: Install dependencies
        run: npm ci
      
      # 7. Run tests (with decrypted secrets)
      - name: Run tests
        run: npm test
        # DATABASE_URL and other secrets are now available as env vars
      
      # 8. Build application
      - name: Build
        run: npm run build
      
      # 9. Deploy (example: to Heroku)
      - name: Deploy to production
        run: |
          # Example deployment script
          ./scripts/deploy.sh
        # API_KEY, AWS credentials, etc. available here
```

### 6. Test the Workflow

```bash
# Push changes to trigger workflow
git add .github/workflows/deploy.yml
git commit -m "Add GitHub Actions workflow with envx"
git push origin main

# Monitor workflow execution
gh workflow view
gh run watch
```

## Advanced Patterns

### Multi-Environment Setup

**Scenario:** Different secrets for dev/staging/production

```bash
# Create separate encrypted files
envx init --key .envx.key.dev
envx encrypt .env.dev --output .envx.dev --key .envx.key.dev

envx init --key .envx.key.staging
envx encrypt .env.staging --output .envx.staging --key .envx.key.staging

envx init --key .envx.key.prod
envx encrypt .env.prod --output .envx.prod --key .envx.key.prod

# Commit all .envx files (but not keys!)
git add .envx.dev .envx.staging .envx.prod
git commit -m "Add multi-environment secrets"
```

**GitHub Secrets:**
- `ENVX_KEY_DEV`
- `ENVX_KEY_STAGING`
- `ENVX_KEY_PROD`

**Workflow:**
```yaml
jobs:
  deploy-prod:
    runs-on: ubuntu-latest
    environment: production  # Use GitHub Environments
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup production environment
        run: |
          echo "${{ secrets.ENVX_KEY_PROD }}" > .envx.key
          envx export-vars .envx.prod >> $GITHUB_ENV
          rm .envx.key
      
      - name: Deploy to production
        run: ./scripts/deploy-prod.sh
```

### Conditional Decryption

**Scenario:** Only decrypt secrets on `main` branch or for specific events

```yaml
- name: Setup secrets (production only)
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'
  run: |
    echo "${{ secrets.ENVX_KEY }}" > .envx.key
    envx export-vars .envx >> $GITHUB_ENV
    shred -u .envx.key
```

### Using envx run Instead of export-vars

**Alternative:** Execute commands directly with decrypted environment

```yaml
- name: Run tests with secrets
  run: |
    echo "${{ secrets.ENVX_KEY }}" > .envx.key
    envx run -- npm test
    rm .envx.key
```

**Advantage:** Secrets never written to `$GITHUB_ENV` file (more secure)

### Matrix Builds with Different Secrets

**Scenario:** Different API keys for each test environment

```yaml
strategy:
  matrix:
    environment: [dev, staging, prod]

steps:
  - name: Setup environment
    run: |
      echo "${{ secrets[format('ENVX_KEY_{0}', matrix.environment)] }}" > .envx.key
      envx export-vars .envx.${{ matrix.environment }} >> $GITHUB_ENV
      rm .envx.key
```

## Security Best Practices

### DO

1. **Use separate keys per environment:**
   ```bash
   # Good: dev/staging/prod have different keys
   ENVX_KEY_DEV, ENVX_KEY_STAGING, ENVX_KEY_PROD
   ```

2. **Delete key file immediately after use:**
   ```yaml
   - run: |
       echo "$ENVX_KEY" > .envx.key
       envx export-vars .envx >> $GITHUB_ENV
       shred -u .envx.key  # Securely delete
   ```

3. **Use GitHub Environments for sensitive deployments:**
   ```yaml
   jobs:
     deploy:
       environment: production  # Requires manual approval
   ```

4. **Verify `.envx` file before using:**
   ```yaml
   - run: envx verify .envx
   ```

5. **Limit workflow permissions:**
   ```yaml
   permissions:
     contents: read  # Don't grant unnecessary write access
   ```

6. **Use ephemeral runners for sensitive workloads:**
   ```yaml
   runs-on: [self-hosted, ephemeral]
   ```

### DON'T

1. **Don't print decrypted secrets:**
   ```yaml
   # BAD: Exposes secrets in logs
   - run: envx show .envx
   ```

2. **Don't commit `.envx.key` or `.env`:**
   ```bash
   # Add to .gitignore immediately
   echo ".envx.key" >> .gitignore
   echo ".env*" >> .gitignore
   ```

3. **Don't reuse keys across projects:**
   ```bash
   # BAD: Same key for multiple repos
   # Generate unique key per repository
   ```

4. **Don't use weak passwords for key derivation:**
   ```bash
   # BAD: envx init --mode password
   # (then entering "password123")
   
   # GOOD: Use random keys
   envx init
   ```

5. **Don't leave key file on runner:**
   ```yaml
   # BAD: Key remains on disk
   - run: |
       echo "$ENVX_KEY" > .envx.key
       envx export-vars .envx >> $GITHUB_ENV
   
   # GOOD: Clean up immediately
   - run: |
       echo "$ENVX_KEY" > .envx.key
       envx export-vars .envx >> $GITHUB_ENV
       rm .envx.key
   ```

## Troubleshooting

### Error: "Key file not found"

**Problem:** `.envx.key` file not created before use

**Solution:**
```yaml
- run: |
    echo "${{ secrets.ENVX_KEY }}" > .envx.key
    envx export-vars .envx >> $GITHUB_ENV
    rm .envx.key
```

### Error: "Decryption failed: MAC verification failed"

**Problem:** Wrong key or tampered `.envx` file

**Solutions:**
1. Verify GitHub Secret `ENVX_KEY` matches local `.envx.key`
2. Re-encrypt `.envx` file: `envx encrypt .env`
3. Check for merge conflicts in `.envx` file

### Error: "envx: command not found"

**Problem:** envx not installed in workflow

**Solution:**
```yaml
- run: npm install -g envx
```

### Secrets Not Available in Subsequent Steps

**Problem:** `$GITHUB_ENV` not properly set

**Solution:** Ensure using `>>` (append), not `>` (overwrite):
```yaml
- run: envx export-vars .envx >> $GITHUB_ENV  # Correct
- run: envx export-vars .envx > $GITHUB_ENV   # WRONG: Overwrites
```

### GitHub Secret Too Large

**Problem:** `.envx.key` file size exceeds secret limit (48 KB)

**Note:** This shouldn't happen (keys are only 32 bytes), but if using base64 encoding:

**Solution:**
```yaml
- run: echo "${{ secrets.ENVX_KEY }}" | base64 -d > .envx.key
```

## Example: Complete CI/CD Pipeline

```yaml
name: Production Deploy

on:
  push:
    branches: [main]

env:
  NODE_VERSION: '20'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
      
      # Use test environment secrets
      - name: Setup test environment
        run: |
          echo "${{ secrets.ENVX_KEY_TEST }}" > .envx.key
          npm install -g envx
          envx export-vars .envx.test >> $GITHUB_ENV
          shred -u .envx.key
      
      - run: npm ci
      - run: npm test
      - run: npm run lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    environment: production  # Requires approval
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
      
      # Use production secrets
      - name: Setup production environment
        run: |
          echo "${{ secrets.ENVX_KEY_PROD }}" > .envx.key
          npm install -g envx
          envx export-vars .envx.prod >> $GITHUB_ENV
          shred -u .envx.key
      
      - run: npm ci
      - run: npm run build
      
      - name: Deploy to Heroku
        run: |
          echo "$HEROKU_API_KEY" | heroku auth:token
          git push heroku main
        env:
          HEROKU_API_KEY: ${{ env.HEROKU_API_KEY }}
```

## Key Rotation in CI/CD

When rotating encryption keys:

```bash
# 1. Generate new key locally
envx init --key .envx.key.new

# 2. Rotate encrypted file
envx rotate .envx.key.new

# 3. Verify new file
envx verify .envx --key .envx.key.new

# 4. Update GitHub Secret
gh secret set ENVX_KEY < .envx.key.new

# 5. Commit rotated .envx file
git add .envx
git commit -m "Rotate encryption key"
git push origin main

# 6. Delete old key
shred -u .envx.key
mv .envx.key.new .envx.key
```

**Important:** Update GitHub Secret BEFORE pushing rotated `.envx` file, or CI will fail with decryption errors.

## Additional Resources

- [GitHub Actions Security Hardening](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [Using Secrets in GitHub Actions](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)
- [envx Security Policy](../../docs/SECURITY.md)
- [envx CLI Reference](../../README.md#cli-reference)

## Questions?

- **Issues:** [github.com/semicolon-systems/envx/issues](https://github.com/semicolon-systems/envx/issues)
- **Discussions:** [github.com/semicolon-systems/envx/discussions](https://github.com/semicolon-systems/envx/discussions)
- **Security:** GitHub Security Advisory
          npx envx export-vars .envx >> $GITHUB_ENV
          
          # Clean up key file (optional, will be removed at end of job)
          rm .envx.key
      
      - name: Install dependencies
        run: npm install
      
      - name: Build
        run: npm run build
      
      - name: Deploy
        run: npm run deploy
        # Env vars now available: ${{ env.API_KEY }}, etc.
```

## Best Practices

Do:
- Keep `.envx.key` out of version control
- Store key in GitHub Secrets
- Use ephemeral runners when possible
- Rotate keys periodically
- Audit access to secrets

Don't:
- Commit `.envx.key` to repo
- Print env vars in logs
- Use secrets in branch names or PR descriptions
- Share key via email or Slack

## Multiple Environments

```yaml
jobs:
  deploy-dev:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          echo "${{ secrets.ENVX_KEY_DEV }}" > .envx.key
          npx envx export-vars .envx.dev >> $GITHUB_ENV
          rm .envx.key
      - run: npm run deploy:dev

  deploy-prod:
    runs-on: ubuntu-latest
    needs: deploy-dev
    steps:
      - uses: actions/checkout@v4
      - run: |
          echo "${{ secrets.ENVX_KEY_PROD }}" > .envx.key
          npx envx export-vars .envx.prod >> $GITHUB_ENV
          rm .envx.key
      - run: npm run deploy:prod
```

## Troubleshooting

**Error: "Key file not found"**
- Verify `ENVX_KEY` secret is set: Settings → Secrets
- Check echo command: `echo "${{ secrets.ENVX_KEY }}" > .envx.key`

**Error: "MAC verification failed"**
- Ensure you're using the correct `.envx` file for the key
- `.envx` is encrypted with specific key—mismatched keys will fail

**Why not store entire .envx.key as Base64?**
- Plain text in GitHub Secrets is fine (encrypted at rest)
- Binary files need Base64 encoding for text fields
- Our KDF outputs binary, so we store as plain bytes

---

For more examples, see:
- https://docs.github.com/actions/security-guides/encrypted-secrets
- envx documentation: README.md
