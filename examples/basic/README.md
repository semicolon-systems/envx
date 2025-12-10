# Basic Example

This example demonstrates the basic usage of envx for encrypting and managing environment variables.

## Setup

1. Initialize a new envx project with a random key:

```bash
envx init random
```

This creates `.envx.key` in the current directory.

2. Create a `.env` file with your secrets:

```bash
cat > .env << EOF
DATABASE_URL=postgres://localhost:5432/mydb
API_KEY=your-secret-api-key
STRIPE_KEY=sk_test_xxxxxxxxx
DEBUG=true
EOF
```

3. Encrypt the `.env` file:

```bash
envx encrypt .env
```

This creates `.envx` with encrypted values.

4. Add `.envx.key` and `.env` to `.gitignore`, commit `.envx`:

```bash
echo ".envx.key" >> .gitignore
echo ".env" >> .gitignore
git add .envx .gitignore
git commit -m "Add encrypted environment variables"
```

## Usage

### Show decrypted values

```bash
envx show .envx
```

### Run application with environment variables

```bash
envx run --envx .envx node app.js
```

### Export for shell

```bash
eval $(envx export-vars .envx)
```

### Verify integrity

```bash
envx verify .envx
```

## Security Notes

- **Never commit `.envx.key`** - This is your encryption key
- Store `.envx.key` securely (password manager, secrets vault)
- Share `.envx` safely in version control
- Use different keys for different environments (dev, staging, prod)
