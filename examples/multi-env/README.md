# Multi-Environment Example

This example demonstrates managing multiple environments (development, staging, production) with separate encryption keys.

## Project Structure

```
.
├── .envx.key.dev      # Development key (gitignored)
├── .envx.key.staging  # Staging key (gitignored)
├── .envx.key.prod     # Production key (gitignored)
├── .envx.dev          # Encrypted dev secrets (committed)
├── .envx.staging      # Encrypted staging secrets (committed)
├── .envx.prod         # Encrypted prod secrets (committed)
└── .gitignore
```

## Setup

### 1. Initialize keys for each environment

```bash
# Development
envx init random -k .envx.key.dev

# Staging  
envx init random -k .envx.key.staging

# Production
envx init random -k .envx.key.prod
```

### 2. Create environment-specific .env files

```bash
# Development (.env.dev)
cat > .env.dev << EOF
DATABASE_URL=postgres://localhost:5432/mydb_dev
API_KEY=dev-api-key-12345
DEBUG=true
LOG_LEVEL=debug
EOF

# Staging (.env.staging)
cat > .env.staging << EOF
DATABASE_URL=postgres://staging-db.example.com:5432/mydb
API_KEY=staging-api-key-67890
DEBUG=false
LOG_LEVEL=info
EOF

# Production (.env.prod)
cat > .env.prod << EOF
DATABASE_URL=postgres://prod-db.example.com:5432/mydb
API_KEY=prod-api-key-abcdef
DEBUG=false
LOG_LEVEL=warn
EOF
```

### 3. Encrypt each environment

```bash
envx encrypt .env.dev -o .envx.dev -k .envx.key.dev
envx encrypt .env.staging -o .envx.staging -k .envx.key.staging
envx encrypt .env.prod -o .envx.prod -k .envx.key.prod
```

### 4. Configure .gitignore

```bash
cat > .gitignore << EOF
.envx.key.*
.env.*
EOF
```

### 5. Commit encrypted files

```bash
git add .envx.* .gitignore
git commit -m "Add multi-environment encrypted secrets"
```

## Usage

### Development

```bash
# Show dev secrets
envx show .envx.dev -k .envx.key.dev

# Run with dev environment
envx run -e .envx.dev -k .envx.key.dev -- npm run dev
```

### Staging

```bash
# Show staging secrets
envx show .envx.staging -k .envx.key.staging

# Run with staging environment
envx run -e .envx.staging -k .envx.key.staging -- npm start
```

### Production

```bash
# Show prod secrets
envx show .envx.prod -k .envx.key.prod

# Run with prod environment
envx run -e .envx.prod -k .envx.key.prod -- npm start
```

## Key Management

### Store keys securely

1. **Development keys**: Store in password manager or local keychain
2. **Staging keys**: Store in team password manager
3. **Production keys**: Store in secrets vault (AWS Secrets Manager, HashiCorp Vault, etc.)

### Key rotation

When rotating keys (e.g., quarterly or after team member changes):

```bash
# Generate new key
envx init random -k .envx.key.prod.new

# Rotate (re-encrypt with new key)
envx rotate .envx.key.prod.new -k .envx.key.prod -e .envx.prod

# Replace old key
mv .envx.key.prod.new .envx.key.prod

# Commit updated encrypted file
git add .envx.prod
git commit -m "Rotate production encryption key"
```

## Deployment

### CI/CD Configuration

Store environment-specific keys as CI/CD secrets:

- `ENVX_KEY_DEV`
- `ENVX_KEY_STAGING`  
- `ENVX_KEY_PROD`

Example GitHub Actions workflow:

```yaml
jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: echo "${{ secrets.ENVX_KEY_STAGING }}" | base64 -d > .envx.key
      - run: envx run -e .envx.staging -k .envx.key -- npm run deploy

  deploy-prod:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - run: echo "${{ secrets.ENVX_KEY_PROD }}" | base64 -d > .envx.key
      - run: envx run -e .envx.prod -k .envx.key -- npm run deploy
```

## Best Practices

1. **Different keys per environment** - Never reuse keys across environments
2. **Regular rotation** - Rotate production keys quarterly
3. **Access control** - Limit who has access to production keys
4. **Audit trail** - Log all key accesses and rotations
5. **Backup keys** - Store encrypted backups of keys in secure location
6. **Test rotation** - Practice key rotation in dev/staging first
