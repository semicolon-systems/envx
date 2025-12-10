# GitHub Actions Example

Use envx to securely manage secrets in GitHub Actions workflows.

## Setup

1. Create `.envx.key` locally:

   ```bash
   envx init
   ```

2. Encrypt your secrets:

   ```bash
   envx encrypt .env
   git add .envx
   git commit -m "Add encrypted secrets"
   ```

3. **Do NOT commit `.envx.key`**

4. Add key to GitHub Secrets:
   - Go to Settings → Secrets and Variables → Actions
   - New Repository Secret: `ENVX_KEY`
   - Paste contents of `.envx.key`

## Workflow Example

```yaml
name: Build & Deploy

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Setup environment
        run: |
          # Write key from secret
          echo "${{ secrets.ENVX_KEY }}" > .envx.key

          # Export decrypted vars to GitHub environment
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

✅ Do:

- Keep `.envx.key` out of version control
- Store key in GitHub Secrets
- Use ephemeral runners when possible
- Rotate keys periodically
- Audit access to secrets

❌ Don't:

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
