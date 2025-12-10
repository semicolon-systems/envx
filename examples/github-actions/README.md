# GitHub Actions Example

This example shows how to use envx in GitHub Actions for secure CI/CD workflows.

## Setup

### 1. Encrypt your environment variables locally

```bash
# Initialize with random key
envx init random

# Encrypt your .env file
envx encrypt .env
```

### 2. Add encryption key to GitHub Secrets

1. Read your key in base64:
   ```bash
   base64 < .envx.key
   ```

2. Add to GitHub repository:
   - Go to Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `ENVX_KEY`
   - Value: (paste the base64 output)

### 3. Commit encrypted file

```bash
git add .envx
git commit -m "Add encrypted environment variables"
git push
```

## Workflow Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install envx
        run: npm install -g envx-secure
      
      - name: Restore encryption key
        run: echo "${{ secrets.ENVX_KEY }}" | base64 -d > .envx.key
      
      - name: Export environment variables
        run: envx export-vars .envx >> $GITHUB_ENV
      
      - name: Verify secrets loaded
        run: |
          echo "DATABASE_URL is set: ${DATABASE_URL:+yes}"
          echo "API_KEY is set: ${API_KEY:+yes}"
      
      - name: Deploy application
        run: |
          # Your deployment commands here
          npm install
          npm run build
          # Deploy to your server
```

## Alternative: Direct command execution

```yaml
- name: Run with envx
  env:
    ENVX_KEY: ${{ secrets.ENVX_KEY }}
  run: |
    echo "$ENVX_KEY" | base64 -d > .envx.key
    envx run --envx .envx -- npm run deploy
```

## Security Best Practices

1. **Use separate keys per environment**: Different keys for dev, staging, production
2. **Rotate keys periodically**: Use `envx rotate` to change keys
3. **Audit access**: Review who has access to GitHub Secrets
4. **Clean up**: Keys are automatically removed when workflow ends
5. **Branch protection**: Protect main branch to control secret access

## Troubleshooting

### Key decoding fails
```bash
# Test locally
echo "$ENVX_KEY" | base64 -d > test.key
# Verify it matches your .envx.key
diff .envx.key test.key
```

### Secrets not loaded
```bash
# Verify .envx file integrity
envx verify .envx
```
