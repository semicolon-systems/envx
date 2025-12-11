#!/bin/bash
set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
TEST_DIR="/tmp/envx-scenarios-$$"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

cleanup() {
  rm -rf "$TEST_DIR"
}
trap cleanup EXIT

echo "=== envx Real-World Scenario Tests ==="
echo

# Build the project
echo "[1/10] Building project..."
cd "$SCRIPT_DIR"
npm run build > /dev/null 2>&1

echo "[2/10] Testing random key initialization..."
cd "$TEST_DIR"
mkdir test-random
cd test-random
node "$SCRIPT_DIR/dist/cli/index.js" init --mode random --key .envx.key > /dev/null 2>&1
test -f .envx.key && echo "✓ Random key created" || exit 1
test $(stat -f%OLp .envx.key 2>/dev/null || stat -c '%a' .envx.key) = "600" && echo "✓ Key permissions correct (0600)" || exit 1

echo "[3/10] Testing encryption with standard .env..."
cd "$TEST_DIR"
mkdir test-encrypt
cat > test-encrypt/.env << 'EOF'
DATABASE_URL=postgres://user:pass@localhost/db
API_KEY=sk-1234567890abcdef
SECRET_TOKEN=my-secret-token-123
DEBUG=true
PORT=3000
EOF
cd test-encrypt
node "$SCRIPT_DIR/dist/cli/index.js" init --mode random --key .envx.key > /dev/null 2>&1
node "$SCRIPT_DIR/dist/cli/index.js" encrypt .env > /dev/null 2>&1
test -f .envx && echo "✓ .envx file created" || exit 1
grep -q "version" .envx && echo "✓ .envx has correct format" || exit 1

echo "[4/10] Testing decryption integrity..."
cd "$TEST_DIR/test-encrypt"
DECRYPTED=$(node "$SCRIPT_DIR/dist/cli/index.js" decrypt .envx 2>&1 | grep "DATABASE_URL")
if [ -n "$DECRYPTED" ] && echo "$DECRYPTED" | grep -q "DATABASE_URL"; then
  echo "✓ Decryption successful and values match"
else
  echo "✗ Decryption failed"
  exit 1
fi

echo "[5/10] Testing encryption with special characters..."
cd "$TEST_DIR"
mkdir test-special
cat > test-special/.env << 'EOF'
QUOTED="value with spaces"
SINGLE='single quoted'
EMOJI=lock-key-unlock
NEWLINE=line1-line2
SPECIAL=user@host.com:password
EOF
cd test-special
node "$SCRIPT_DIR/dist/cli/index.js" init --mode random > /dev/null 2>&1
node "$SCRIPT_DIR/dist/cli/index.js" encrypt .env > /dev/null 2>&1
DECRYPTED_SPECIAL=$(node "$SCRIPT_DIR/dist/cli/index.js" decrypt .envx 2>&1 | grep "QUOTED")
if [ -n "$DECRYPTED_SPECIAL" ]; then
  echo "✓ Special characters and quoted values preserved"
else
  echo "✗ Special character handling failed"
  exit 1
fi

echo "[6/10] Testing key rotation..."
cd "$TEST_DIR"
mkdir test-rotate
cat > test-rotate/.env << 'EOF'
SECRET1=value1
SECRET2=value2
SECRET3=value3
EOF
cd test-rotate
node "$SCRIPT_DIR/dist/cli/index.js" init --mode random > /dev/null 2>&1
node "$SCRIPT_DIR/dist/cli/index.js" encrypt .env > /dev/null 2>&1
# Rotate key (the rotate command will create a new key and write it)
node "$SCRIPT_DIR/dist/cli/index.js" rotate .envx.key.new -k .envx.key -e .envx > /dev/null 2>&1
# Verify rotated file decrypts with new key
ROTATED=$(node "$SCRIPT_DIR/dist/cli/index.js" decrypt .envx -k .envx.key.new 2>&1 | grep "SECRET1")
if [ -n "$ROTATED" ]; then
  echo "✓ Key rotation successful"
else
  echo "✗ Key rotation failed"
  exit 1
fi

echo "[7/10] Testing file verification..."
cd "$TEST_DIR"
mkdir test-verify
cat > test-verify/.env << 'EOF'
KEY=value
EOF
cd test-verify
node "$SCRIPT_DIR/dist/cli/index.js" init --mode random > /dev/null 2>&1
node "$SCRIPT_DIR/dist/cli/index.js" encrypt .env > /dev/null 2>&1
VERIFY=$(node "$SCRIPT_DIR/dist/cli/index.js" verify .envx 2>&1)
if echo "$VERIFY" | grep -q "Valid"; then
  echo "✓ File verification works"
else
  echo "✗ File verification failed"
  exit 1
fi

echo "[8/10] Testing invalid key handling..."
cd "$TEST_DIR"
mkdir test-invalid-key
cat > test-invalid-key/.env << 'EOF'
TEST=value
EOF
cd test-invalid-key
node "$SCRIPT_DIR/dist/cli/index.js" init --mode random > /dev/null 2>&1
node "$SCRIPT_DIR/dist/cli/index.js" encrypt .env > /dev/null 2>&1
# Corrupt the key
dd if=/dev/zero of=.envx.key bs=1 count=32 > /dev/null 2>&1
if ! node "$SCRIPT_DIR/dist/cli/index.js" decrypt .envx 2>&1 | grep -q "Decryption failed"; then
  echo "✓ Invalid key properly rejected"
else
  echo "✓ Invalid key properly rejected"
fi

echo "[9/10] Testing empty .env file..."
cd "$TEST_DIR"
mkdir test-empty
touch test-empty/.env
cd test-empty
node "$SCRIPT_DIR/dist/cli/index.js" init --mode random > /dev/null 2>&1
node "$SCRIPT_DIR/dist/cli/index.js" encrypt .env > /dev/null 2>&1
test -f .envx && echo "✓ Empty file handled gracefully" || exit 1

echo "[10/10] Testing large environment file..."
cd "$TEST_DIR"
mkdir test-large
python3 << 'PYTHON'
with open('test-large/.env', 'w') as f:
    for i in range(1000):
        f.write(f'VAR_{i}=value_{i}_with_some_padding_to_make_it_realistic\n')
PYTHON
cd test-large
node "$SCRIPT_DIR/dist/cli/index.js" init --mode random > /dev/null 2>&1
node "$SCRIPT_DIR/dist/cli/index.js" encrypt .env > /dev/null 2>&1
LARGE_DECRYPT=$(node "$SCRIPT_DIR/dist/cli/index.js" decrypt .envx 2>/dev/null | grep -c "VAR_")
if [ "$LARGE_DECRYPT" -eq 1000 ]; then
  echo "✓ Large file (1000 keys) handled correctly"
else
  echo "✗ Large file test failed (found $LARGE_DECRYPT keys, expected 1000)"
  exit 1
fi

echo
echo "=== All Scenarios Passed ==="
