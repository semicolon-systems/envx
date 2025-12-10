# Architecture

**Version 1.0 | Last Updated: 2024-12-10**

## Overview

envx is a production-grade encrypted environment variable management system with a clean layered architecture. It provides both a CLI tool for developers and a programmatic TypeScript API for Node.js applications.

## System Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                         CLI Layer                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │   init   │ │ encrypt  │ │ decrypt  │ │  show    │   ...    │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘          │
│       │            │             │             │                │
│       └────────────┴─────────────┴─────────────┘                │
│                         │                                       │
└─────────────────────────┼───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                      Library Layer                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                   Envx Class                                │ │
│  │  • init()    • encrypt()   • decrypt()   • verify()        │ │
│  │  • Orchestrates crypto, file I/O, validation               │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
         ▼                ▼                ▼
┌────────────────┐ ┌─────────────┐ ┌──────────────┐
│  Crypto Layer  │ │Format Layer │ │ Utils Layer  │
│ ┌────────────┐ │ │┌───────────┐│ │┌────────────┐│
│ │ KDF        │ │ ││ Parser    ││ ││ Logger     ││
│ │ Encrypt    │ │ ││ Validator ││ ││ Errors     ││
│ │ Decrypt    │ │ ││ Builder   ││ ││ Memory     ││
│ │ Cipher     │ │ ││ Schema    ││ ││            ││
│ └────────────┘ │ │└───────────┘│ │└────────────┘│
└────────────────┘ └─────────────┘ └──────────────┘
         │                │                │
         └────────────────┴────────────────┘
                          │
         ┌────────────────┴────────────────┐
         │                                 │
         ▼                                 ▼
┌────────────────┐            ┌────────────────────┐
│  Node.js Core  │            │  External Libs     │
│  • crypto      │            │  • argon2          │
│  • fs          │            │  • ajv             │
│  • child_proc  │            │  • commander       │
└────────────────┘            └────────────────────┘
```

### Design Principles

1. **Separation of Concerns:** CLI, library, crypto, format, and utilities are cleanly isolated
2. **Dependency Injection:** Components don't directly depend on each other; library orchestrates
3. **Fail-Fast Validation:** Reject invalid inputs early with descriptive errors
4. **Immutable Operations:** Encryption/decryption never modify input files in-place
5. **Security by Default:** Conservative choices (authenticated encryption, memory-hard KDF)
6. **Testability:** Each layer independently testable with clear contracts

## Module Structure

### `/src/cli/` - Command-Line Interface

**Purpose:** Developer-facing CLI for common workflows  
**Framework:** Commander.js (battle-tested, 40M+ weekly downloads)

**Files:**
- `index.ts` - Main entry point, command registration, global options
- `commands/init.ts` - Generate encryption keys (random or password-derived)
- `commands/encrypt.ts` - Encrypt `.env` → `.envx`
- `commands/decrypt.ts` - Decrypt `.envx` → stdout (with warnings)
- `commands/show.ts` - Display decrypted values as JSON
- `commands/run.ts` - Execute child process with injected environment
- `commands/verify.ts` - Integrity check (MAC verification, format validation)
- `commands/check.ts` - Schema validation against custom JSON Schema
- `commands/export-vars.ts` - Export as shell-compatible `KEY=VALUE` lines
- `commands/rotate.ts` - Re-encrypt with new key (4-step safe rotation)

**Command Structure:**
```typescript
// Typical command pattern
export async function encryptCommand(inputPath: string, options: Options) {
  const logger = createLogger('cli.encrypt');
  
  // 1. Validate inputs
  if (!existsSync(inputPath)) {
    logger.error('file_not_found', { path: inputPath });
    process.exit(1);
  }
  
  // 2. Execute core logic
  const envx = new Envx(options.key);
  const result = await envx.encrypt(inputPath, options.output);
  
  // 3. User-friendly output
  logger.info('success', { count: Object.keys(result.values).length });
  console.log(`SUCCESS: Encrypted ${inputPath} → ${options.output}`);
}
```

**Design Decisions:**
- **User-friendly output:** Use clear status indicators, clear messages, avoid jargon
- **Progressive disclosure:** Common options in `--help`, advanced in docs
- **Safe defaults:** If optional param omitted, choose secure/conservative option
- **Exit codes:** 0 for success, 1 for user error, 2 for system error

### `/src/lib/` - High-Level API

**Purpose:** Programmatic interface for Node.js applications  
**Exported:** `Envx` class with async methods

**Files:**
- `envx.ts` - Main class orchestrating crypto, I/O, validation (550+ lines)

**Public API:**
```typescript
class Envx {
  constructor(keyPath: string = '.envx.key');
  
  // Key management
  async init(mode: 'random' | 'password', password?: Buffer): Promise<void>;
  
  // Encryption/decryption
  async encrypt(envPath: string, outputPath?: string): Promise<EnvxFile>;
  async decrypt(envxPath: string): Promise<Record<string, string>>;
  
  // Validation
  verify(envxPath: string): { valid: boolean; details: string };
  
  // Key rotation
  async rotate(newKeyPath: string, envxPath: string, outputPath?: string): Promise<void>;
}
```

**Responsibilities:**
1. **File I/O:** Read/write `.env`, `.envx`, `.envx.key` files
2. **Format Conversion:** Parse `.env` → object → encrypt → `.envx` JSON
3. **Error Context:** Wrap low-level errors with user-facing messages
4. **Security Controls:** Set file permissions (0600), wipe buffers, validate inputs
5. **Logging:** Emit structured logs for auditing (never log secrets)

**Key Design Patterns:**

**Pattern 1: Try-Finally Buffer Cleanup**
```typescript
async decrypt(envxPath: string): Promise<Record<string, string>> {
  let key: Buffer | null = null;
  try {
    key = fs.readFileSync(this.keyPath);
    // ... perform decryption ...
    return plaintext;
  } finally {
    if (key) wipeBuffer(key);  // Guaranteed cleanup
  }
}
```

**Pattern 2: Fail-Fast Validation**
```typescript
verify(envxPath: string): { valid: boolean; details: string } {
  // File existence
  if (!existsSync(envxPath)) return { valid: false, details: 'File not found' };
  
  // JSON parsing
  const content = fs.readFileSync(envxPath, 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(content);
  } catch {
    return { valid: false, details: 'Invalid JSON' };
  }
  
  // Schema validation
  const validation = validateEnvxFile(parsed);
  if (!validation.valid) return { valid: false, details: validation.errors };
  
  // MAC verification
  for (const [key, ciphertext] of Object.entries(parsed.values)) {
    try {
      decrypt(key, nonce, ciphertext);  // Throws if MAC fails
    } catch {
      return { valid: false, details: `MAC failure for key: ${key}` };
    }
  }
  
  return { valid: true, details: 'All checks passed' };
}
```

**Pattern 3: Quote-Aware .env Parsing**
```typescript
// Handle various .env formats correctly:
//   KEY=value
//   KEY="quoted value"
//   KEY='single quoted'
//   KEY="with \"escapes\""
//   # comments
//   KEY=value # inline comment
private parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    
    // Skip comments and empty lines
    if (trimmed.startsWith('#') || trimmed === '') continue;
    
    // Extract KEY=VALUE
    const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/i);
    if (!match) continue;
    
    const [, key, rawValue] = match;
    
    // Remove inline comments (unless quoted)
    let value = rawValue;
    if (!value.startsWith('"') && !value.startsWith("'")) {
      value = value.split('#')[0].trim();
    }
    
    // Strip quotes if present
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
      // Unescape \" sequences
      value = value.replace(/\\"/g, '"');
    }
    
    result[key] = value;
  }
  
  return result;
}
```

### `/src/crypto/` - Cryptographic Primitives

**Purpose:** Low-level encryption operations (stateless pure functions)  
**Implementation:** Node.js `crypto` module (OpenSSL-backed)

**Files:**
- `kdf.ts` - Key derivation functions (Argon2id, scrypt)
- `encrypt.ts` - AES-256-GCM encryption
- `decrypt.ts` - AES-256-GCM decryption
- `cipher.ts` - Algorithm constants and utilities
- `memory.ts` - Buffer wiping and secure cleanup

#### `kdf.ts` - Key Derivation

**Function:** Convert password → 256-bit encryption key

**Primary Algorithm: Argon2id**
```typescript
export async function deriveKeyArgon2id(
  password: Buffer,
  salt: Buffer
): Promise<Buffer> {
  const hash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,      // 64 MB (exceeds L3 cache)
    timeCost: 3,            // 3 iterations (~100ms target)
    parallelism: 1,         // Maximize memory-hardness
    hashLength: 32,         // 256 bits
    raw: true,              // Return Buffer, not string
    salt,                   // 16-byte random salt
  });
  return Buffer.from(hash);
}
```

**Why These Parameters?**
- **65536 KB memory:** Too large for GPU L1/L2 cache; forces slow DRAM access
- **3 iterations:** Balances security (harder to brute-force) vs UX (fast enough)
- **1 thread:** Single-threaded maximizes memory access latency (better defense)
- **32-byte output:** Matches AES-256 key size

**Fallback Algorithm: scrypt**
```typescript
export function deriveKeyScrypt(
  password: Buffer,
  salt: Buffer
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 32, {
      N: 32768,  // CPU/memory cost (2^15)
      r: 8,      // Block size
      p: 1,      // Parallelization factor
    }, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}
```

**Selection Logic:**
```typescript
try {
  return await deriveKeyArgon2id(password, salt);
} catch (error) {
  logger.warn('argon2_unavailable', 'Falling back to scrypt');
  return await deriveKeyScrypt(password, salt);
}
```

#### `encrypt.ts` - Authenticated Encryption

**Algorithm:** AES-256-GCM (Galois/Counter Mode)

```typescript
export function encryptValues(
  values: Record<string, string>,
  key: Buffer
): { nonce_map: Record<string, string>; values: Record<string, string> } {
  const logger = createLogger('crypto.encrypt');
  
  const nonce_map: Record<string, string> = {};
  const encrypted_values: Record<string, string> = {};
  
  for (const [k, plaintext] of Object.entries(values)) {
    // Generate unique nonce per value (96 bits)
    const nonce = crypto.randomBytes(NONCE_LENGTH);
    
    // Create cipher
    const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
    
    // Encrypt plaintext
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    
    // Get authentication tag (128 bits)
    const tag = cipher.getAuthTag();
    
    // Store: [tag || ciphertext] as base64
    const encrypted = Buffer.concat([tag, ciphertext]);
    nonce_map[k] = nonce.toString('base64');
    encrypted_values[k] = encrypted.toString('base64');
    
    // Wipe sensitive buffers
    wipeBuffer(nonce);
    logger.debug('encrypted_value', { key: k });
  }
  
  return { nonce_map, values: encrypted_values };
}
```

**Security Properties:**
1. **AEAD:** Single operation provides confidentiality + integrity
2. **Unique nonces:** Random generation avoids nonce-reuse catastrophe
3. **Authentication:** 128-bit tag prevents undetected tampering
4. **No padding oracle:** GCM is stream cipher (no block padding)

#### `decrypt.ts` - Authenticated Decryption

```typescript
export function decryptValues(
  nonce_map: Record<string, string>,
  encrypted_values: Record<string, string>,
  key: Buffer
): Record<string, string> {
  const logger = createLogger('crypto.decrypt');
  const result: Record<string, string> = {};
  
  for (const [k, encryptedB64] of Object.entries(encrypted_values)) {
    const nonceB64 = nonce_map[k];
    if (!nonceB64) {
      throw new ValidationError(`Missing nonce for key: ${k}`);
    }
    
    // Decode from base64
    const nonce = Buffer.from(nonceB64, 'base64');
    const encrypted = Buffer.from(encryptedB64, 'base64');
    
    // Split [tag || ciphertext]
    const tag = encrypted.subarray(0, TAG_LENGTH);
    const ciphertext = encrypted.subarray(TAG_LENGTH);
    
    // Create decipher
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
    decipher.setAuthTag(tag);
    
    try {
      // Decrypt and verify MAC
      const plaintext = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),  // Throws if MAC verification fails
      ]);
      
      result[k] = plaintext.toString('utf8');
      
      // Wipe buffers
      wipeBuffer(nonce);
      wipeBuffer(plaintext);
      logger.debug('decrypted_value', { key: k });
      
    } catch (error) {
      // MAC failure = tampering or wrong key
      throw new DecryptionError(
        `MAC verification failed for key "${k}": wrong key, tampered data, or file corruption`
      );
    }
  }
  
  return result;
}
```

**Failure Semantics:**
- **All-or-nothing:** If ANY value fails MAC verification, entire operation fails
- **No partial results:** Prevents accepting mix of valid/tampered secrets
- **Clear error messages:** Distinguish MAC failure from other errors

### `/src/format/` - File Format Handling

**Purpose:** `.envx` JSON serialization, parsing, validation

**Files:**
- `envx-format.ts` - Format builder/parser functions
- `schema.json` - JSON Schema specification

#### `envx-format.ts`

**Data Structure:**
```typescript
interface EnvxFile {
  version: 1;
  cipher: 'aes-256-gcm';
  kdf: {
    type: 'none' | 'argon2id' | 'scrypt';
    salt: string | null;        // Base64 (16 bytes) if type != none
    params: KdfParams | null;   // Algorithm-specific params
  };
  nonce_map: {
    [key: string]: string;      // Base64 (12 bytes)
  };
  values: {
    [key: string]: string;      // Base64 ([16-byte tag][ciphertext])
  };
  meta: {
    created_at: string;         // ISO 8601 timestamp
    [key: string]: any;         // Extensible
  };
}
```

**Functions:**
```typescript
// Build .envx file from encrypted data
export function buildEnvxFile(
  nonce_map: Record<string, string>,
  values: Record<string, string>,
  kdf?: KdfInfo
): EnvxFile {
  return {
    version: 1,
    cipher: 'aes-256-gcm',
    kdf: kdf || { type: 'none', salt: null, params: null },
    nonce_map,
    values,
    meta: {
      created_at: new Date().toISOString(),
    },
  };
}

// Parse and validate .envx file
export function parseEnvxFile(content: string): EnvxFile {
  const parsed = JSON.parse(content);  // May throw SyntaxError
  
  // Schema validation
  const validation = validateEnvxFile(parsed);
  if (!validation.valid) {
    throw new ValidationError(`Invalid .envx format: ${validation.errors}`);
  }
  
  // Type assertion (validated by schema)
  return parsed as EnvxFile;
}

// Validate against JSON Schema
export function validateEnvxFile(data: any): { valid: boolean; errors?: string } {
  const ajv = new Ajv();
  const validate = ajv.compile(schema);
  const valid = validate(data);
  
  if (!valid) {
    const errors = validate.errors?.map(e => `${e.instancePath} ${e.message}`).join(', ');
    return { valid: false, errors };
  }
  
  // Additional custom validations
  if (data.kdf.type !== 'none' && !data.kdf.salt) {
    return { valid: false, errors: 'KDF requires salt when type != none' };
  }
  
  // Ensure nonce_map and values have matching keys
  const nonceKeys = Object.keys(data.nonce_map).sort();
  const valueKeys = Object.keys(data.values).sort();
  if (JSON.stringify(nonceKeys) !== JSON.stringify(valueKeys)) {
    return { valid: false, errors: 'Nonce map and values must have matching keys' };
  }
  
  return { valid: true };
}
```

#### `schema.json`

**Validation Rules:**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["version", "cipher", "kdf", "nonce_map", "values", "meta"],
  "properties": {
    "version": { "const": 1 },
    "cipher": { "const": "aes-256-gcm" },
    "kdf": {
      "type": "object",
      "required": ["type", "salt", "params"],
      "properties": {
        "type": { "enum": ["none", "argon2id", "scrypt"] },
        "salt": { "type": ["string", "null"] },
        "params": { "type": ["object", "null"] }
      }
    },
    "nonce_map": {
      "type": "object",
      "patternProperties": {
        ".*": { "type": "string" }
      }
    },
    "values": {
      "type": "object",
      "patternProperties": {
        ".*": { "type": "string" }
      }
    },
    "meta": {
      "type": "object",
      "required": ["created_at"],
      "properties": {
        "created_at": { "type": "string", "format": "date-time" }
      }
    }
  }
}
```

**Why JSON Schema?**
- **Self-documenting:** Schema IS the specification
- **Tooling:** Automatic validation, editor autocomplete, documentation generation
- **Extensibility:** New properties can be added without breaking validation
- **Standards-based:** Draft-07 is widely supported

### `/src/utils/` - Shared Utilities

**Files:**
- `logger.ts` - Structured logging (security-aware)
- `errors.ts` - Custom exception hierarchy
- `memory.ts` - Buffer wiping and cleanup

#### `logger.ts` - Structured Logging

**Design Goals:**
1. **Never log secrets:** Sanitize all outputs
2. **Structured format:** Machine-parsable for log aggregation
3. **Contextual:** Include component, operation, metadata
4. **Debug mode:** Verbose logging via `ENVX_DEBUG=1`

**Implementation:**
```typescript
type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface Logger {
  debug(operation: string, meta?: Record<string, any>): void;
  info(operation: string, meta?: Record<string, any>): void;
  warn(operation: string, meta?: Record<string, any>): void;
  error(operation: string, meta?: Record<string, any>): void;
}

export function createLogger(component: string): Logger {
  const isDebug = process.env.ENVX_DEBUG === '1';
  
  function log(level: LogLevel, operation: string, meta?: Record<string, any>) {
    // Skip debug logs unless ENVX_DEBUG=1
    if (level === 'DEBUG' && !isDebug) return;
    
    const timestamp = new Date().toISOString();
    const sanitized = sanitizeMeta(meta || {});
    
    const message = `[${timestamp}] ${level} ${component}.${operation}`;
    const stream = level === 'ERROR' ? process.stderr : process.stdout;
    
    if (Object.keys(sanitized).length > 0) {
      stream.write(`${message}: ${JSON.stringify(sanitized)}\n`);
    } else {
      stream.write(`${message}\n`);
    }
  }
  
  return {
    debug: (op, meta) => log('DEBUG', op, meta),
    info: (op, meta) => log('INFO', op, meta),
    warn: (op, meta) => log('WARN', op, meta),
    error: (op, meta) => log('ERROR', op, meta),
  };
}

// Remove sensitive fields from metadata
function sanitizeMeta(meta: Record<string, any>): Record<string, any> {
  const sanitized = { ...meta };
  const sensitive = ['password', 'key', 'secret', 'token', 'plaintext'];
  
  for (const field of sensitive) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}
```

**Usage Example:**
```typescript
const logger = createLogger('lib.envx');

logger.info('encrypt_start', { input: '.env', output: '.envx' });
// Output: [2024-12-10T18:30:00.000Z] INFO lib.envx.encrypt_start: {"input":".env","output":".envx"}

logger.error('decrypt_failed', { reason: 'wrong key', file: '.envx' });
// Output: [2024-12-10T18:30:05.000Z] ERROR lib.envx.decrypt_failed: {"reason":"wrong key","file":".envx"}
```

#### `errors.ts` - Exception Hierarchy

```typescript
// Base class for all envx errors
export class EnvxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvxError';
    Error.captureStackTrace(this, this.constructor);
  }
}

// File format/validation errors
export class ValidationError extends EnvxError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Decryption failures (wrong key, tampering, corruption)
export class DecryptionError extends EnvxError {
  constructor(message: string) {
    super(message);
    this.name = 'DecryptionError';
  }
}

// Key derivation errors
export class KdfError extends EnvxError {
  constructor(message: string) {
    super(message);
    this.name = 'KdfError';
  }
}

// File already exists (prevent overwrite)
export class FileExistsError extends EnvxError {
  constructor(path: string) {
    super(`File already exists: ${path}`);
    this.name = 'FileExistsError';
  }
}

// Missing required file
export class MissingKeyError extends EnvxError {
  constructor(path: string) {
    super(`Key file not found: ${path}`);
    this.name = 'MissingKeyError';
  }
}
```

**Usage Pattern:**
```typescript
try {
  const result = await envx.decrypt('.envx');
} catch (error) {
  if (error instanceof DecryptionError) {
    console.error('Failed to decrypt: wrong key or tampered file');
    process.exit(1);
  } else if (error instanceof ValidationError) {
    console.error('Invalid .envx file format');
    process.exit(1);
  } else {
    throw error;  // Unknown error, re-throw
  }
}
```

#### `memory.ts` - Secure Buffer Cleanup

```typescript
/**
 * Wipe buffer by overwriting with zeros.
 * 
 * SECURITY NOTE: This is NOT a guarantee against memory forensics.
 * Limitations:
 * - V8 may have copied buffer during GC
 * - Compiler may optimize away "dead" writes
 * - OS may have paged memory to swap
 * - Spectre/Meltdown can read speculative buffers
 * 
 * Best effort defense: minimizes window of exposure.
 */
export function wipeBuffer(buffer: Buffer): void {
  if (!buffer || buffer.length === 0) return;
  buffer.fill(0);
}

/**
 * Wipe multiple buffers in single call.
 */
export function wipeBuffers(...buffers: Buffer[]): void {
  for (const buf of buffers) {
    wipeBuffer(buf);
  }
}
```

**Usage Pattern:**
```typescript
let key: Buffer | null = null;
let plaintext: Buffer | null = null;

try {
  key = fs.readFileSync('.envx.key');
  plaintext = decrypt(ciphertext, key);
  // ... use plaintext ...
  return plaintext.toString('utf8');
} finally {
  // Guaranteed cleanup even if exception thrown
  if (key) wipeBuffer(key);
  if (plaintext) wipeBuffer(plaintext);
}
```

## Data Flow Diagrams

### Encryption Workflow

```
.env File (plaintext)
    │
    ├─ "DATABASE_URL=postgres://..."
    ├─ "API_KEY=sk_live_..."
    └─ "SECRET_TOKEN=abc123..."
    │
    ▼
┌────────────────────────────────┐
│   Parse KEY=VALUE Lines        │
│   • Skip comments/blank        │
│   • Handle quotes/escapes      │
│   • Strip inline comments      │
└───────────┬────────────────────┘
            │
            ▼
{
  "DATABASE_URL": "postgres://...",
  "API_KEY": "sk_live_...",
  "SECRET_TOKEN": "abc123..."
}
            │
            ▼
┌────────────────────────────────┐
│   Load Encryption Key          │
│   • Read .envx.key             │
│   • Validate 32-byte length    │
└───────────┬────────────────────┘
            │
            ▼
FOR EACH (key, value):
┌────────────────────────────────┐
│   Generate Random Nonce        │
│   • crypto.randomBytes(12)     │
│   • CSPRNG-backed              │
└───────────┬────────────────────┘
            │
            ▼
┌────────────────────────────────┐
│   AES-256-GCM Encrypt          │
│   • cipher = aes-gcm(key,nonce)│
│   • ct = cipher.update(value)  │
│   • tag = cipher.getAuthTag()  │
└───────────┬────────────────────┘
            │
            ▼
┌────────────────────────────────┐
│   Store Encrypted Data         │
│   • nonce_map[k] = base64(nonce)
│   • values[k] = base64(tag||ct)│
└───────────┬────────────────────┘
            │
END LOOP    ▼
┌────────────────────────────────┐
│   Build EnvxFile JSON          │
│   • version: 1                 │
│   • cipher: "aes-256-gcm"      │
│   • kdf: {...}                 │
│   • nonce_map: {...}           │
│   • values: {...}              │
│   • meta: {created_at: ...}    │
└───────────┬────────────────────┘
            │
            ▼
┌────────────────────────────────┐
│   Serialize to Disk            │
│   • JSON.stringify(file, 2)    │
│   • fs.writeFileSync(.envx)    │
│   • chmod 0600 (owner only)    │
└───────────┬────────────────────┘
            │
            ▼
┌────────────────────────────────┐
│   Wipe Sensitive Buffers       │
│   • wipeBuffer(key)            │
│   • wipeBuffer(nonces)         │
│   • wipeBuffer(plaintext)      │
└────────────────────────────────┘
            │
            ▼
        SUCCESS
  .envx file ready to commit
```

### Decryption Workflow

```
.envx File (JSON)
    │
    └─ {version:1, cipher:..., values:{...}}
    │
    ▼
┌────────────────────────────────┐
│   Parse JSON                   │
│   • JSON.parse()               │
│   • Catch SyntaxError          │
└───────────┬────────────────────┘
            │
            ▼
┌────────────────────────────────┐
│   Validate Against Schema      │
│   • Check version = 1          │
│   • Check cipher = aes-256-gcm │
│   • Check nonce/value keys match
│   • Validate base64 encoding   │
└───────────┬────────────────────┘
            │ valid
            ▼
┌────────────────────────────────┐
│   Load Decryption Key          │
│   • Read .envx.key             │
│   • Validate 32-byte length    │
└───────────┬────────────────────┘
            │
            ▼
FOR EACH (key, encrypted_value):
┌────────────────────────────────┐
│   Decode Base64                │
│   • nonce = decode(nonce_map[k])
│   • data = decode(values[k])   │
└───────────┬────────────────────┘
            │
            ▼
┌────────────────────────────────┐
│   Split Tag and Ciphertext     │
│   • tag = data[0:16]           │
│   • ciphertext = data[16:]     │
└───────────┬────────────────────┘
            │
            ▼
┌────────────────────────────────┐
│   AES-256-GCM Decrypt          │
│   • decipher = aes(key, nonce) │
│   • decipher.setAuthTag(tag)   │
│   • plaintext = decipher.final()│
│   • MAC verified here!         │
└───────────┬────────────────────┘
            │ MAC valid
            ▼
┌────────────────────────────────┐
│   Convert to UTF-8 String      │
│   • plaintext.toString('utf8') │
└───────────┬────────────────────┘
            │
END LOOP    ▼
{
  "DATABASE_URL": "postgres://...",
  "API_KEY": "sk_live_...",
  "SECRET_TOKEN": "abc123..."
}
            │
            ▼
┌────────────────────────────────┐
│   Wipe Sensitive Buffers       │
│   • wipeBuffer(key)            │
│   • wipeBuffer(nonces)         │
│   • wipeBuffer(ciphertext)     │
└────────────────────────────────┘
            │
            ▼
        SUCCESS
  Return plaintext dict
```

### Key Derivation Workflow (Password Mode)

```
User Password Input
    │
    └─ "my_secure_passphrase_2024"
    │
    ▼
┌────────────────────────────────┐
│   Generate Random Salt         │
│   • crypto.randomBytes(16)     │
│   • 128 bits entropy           │
└───────────┬────────────────────┘
            │
            ▼
┌────────────────────────────────┐
│   Argon2id Derivation          │
│   • memory: 64 MB              │
│   • iterations: 3              │
│   • parallelism: 1             │
│   • output: 32 bytes           │
│   • time: ~100ms               │
└───────────┬────────────────────┘
            │ success
            ▼
┌────────────────────────────────┐
│   256-bit Encryption Key       │
│   • cryptographically strong   │
│   • unique per password+salt   │
└───────────┬────────────────────┘
            │
            ▼
┌────────────────────────────────┐
│   Write to .envx.key           │
│   • fs.writeFileSync(key, 0600)│
│   • Store in secure location   │
└───────────┬────────────────────┘
            │
            ▼
┌────────────────────────────────┐
│   Store KDF Metadata in .envx  │
│   • kdf.type = "argon2id"      │
│   • kdf.salt = base64(salt)    │
│   • kdf.params = {...}         │
└────────────────────────────────┘
            │
            ▼
┌────────────────────────────────┐
│   Wipe Password Buffer         │
│   • wipeBuffer(password)       │
└────────────────────────────────┘
            │
            ▼
        SUCCESS
   Key ready for encryption
   
[If Argon2id fails]
            │
            ▼ error
┌────────────────────────────────┐
│   Fallback to scrypt           │
│   • N: 32768 (2^15)            │
│   • r: 8, p: 1                 │
│   • output: 32 bytes           │
│   • time: ~150ms               │
└────────────────────────────────┘
```

## Security Model

### Trust Boundaries

```
┌──────────────────────────────────────────────────────────┐
│                   TRUSTED ZONE                           │
│  ┌────────────────┐  ┌────────────────┐                 │
│  │  Workstation   │  │  CI/CD Runner  │                 │
│  │  • .envx.key   │  │  • $ENVX_KEY   │                 │
│  │  • RAM secrets │  │  • ephemeral   │                 │
│  └────────────────┘  └────────────────┘                 │
│           ▲                   ▲                          │
│           └─────────┬─────────┘                          │
│                     │ decryption                         │
└─────────────────────┼────────────────────────────────────┘
                      │
    ══════════════════╪══════════════════  TRUST BOUNDARY
                      │
┌─────────────────────▼────────────────────────────────────┐
│                 UNTRUSTED ZONE                           │
│  ┌────────────────┐  ┌────────────────┐                 │
│  │ Git Repository │  │  .envx File    │                 │
│  │ • Public?      │  │  • Encrypted   │                 │
│  │ • Compromised? │  │  • Authenticated│                 │
│  └────────────────┘  └────────────────┘                 │
│                                                          │
│  Assumptions:                                            │
│  X Repository may be leaked/public                      │
│  X .envx file may be tampered with                      │
│  ✔ Encryption key remains secret                        │
│  ✔ Tampering will be detected (MAC)                     │
└──────────────────────────────────────────────────────────┘
```

### Threat Coverage Matrix

| Threat | Severity | Mitigated? | Mechanism |
|--------|----------|-----------|-----------|
| Accidental `.env` commit | HIGH | YES | Encryption before commit |
| Public repo exposure | HIGH | YES | AES-256-GCM encryption |
| Weak password | MEDIUM | YES | Argon2id memory-hard KDF |
| Ciphertext tampering | HIGH | YES | GCM authentication tag |
| Rainbow tables | MEDIUM | YES | Random 128-bit salt |
| Key compromise | CRITICAL | NO | Outside scope (key IS secret) |
| Memory dump | MEDIUM | NO | Node.js limitation |
| Side-channel | LOW | PARTIAL | OpenSSL mitigations |
| Social engineering | HIGH | NO | Human factor |

## Testing Strategy

### Unit Tests (`test/*.test.ts`)

**Coverage Areas:**
1. **Crypto operations** (`crypto.test.ts`)
   - Key derivation (Argon2id, scrypt)
   - Encryption/decryption round-trips
   - MAC verification (tampered data rejection)
   - Buffer wiping

2. **Format handling** (`format.test.ts`)
   - JSON parsing (valid/invalid)
   - Schema validation (missing fields, wrong types)
   - Base64 encoding/decoding
   - Custom validation rules

3. **Library integration** (`cli.test.ts`)
   - Envx class methods (init, encrypt, decrypt)
   - File I/O operations
   - Error handling and propagation
   - Edge cases (empty files, long values)

**Test Framework:** Vitest (fast, ESM-native, TypeScript support)

**Example Test:**
```typescript
describe('Encryption', () => {
  it('should encrypt and decrypt correctly', async () => {
    const envx = new Envx();
    await envx.init('random');
    
    const encrypted = await envx.encrypt('test.env');
    const decrypted = await envx.decrypt('.envx');
    
    expect(decrypted.API_KEY).toBe('test_value');
  });
  
  it('should reject tampered ciphertext', async () => {
    const envx = new Envx();
    await envx.init('random');
    await envx.encrypt('test.env');
    
    // Tamper with .envx file
    const content = JSON.parse(fs.readFileSync('.envx', 'utf8'));
    content.values.API_KEY = 'AAAA' + content.values.API_KEY.slice(4);
    fs.writeFileSync('.envx', JSON.stringify(content));
    
    // Should throw DecryptionError
    await expect(envx.decrypt('.envx')).rejects.toThrow(DecryptionError);
  });
});
```

### Integration Tests

**Scenarios:**
- CLI end-to-end workflows (init → encrypt → decrypt → verify)
- Multi-environment (separate keys for dev/staging/prod)
- Key rotation (old key → new key, verify integrity)
- CI/CD simulation (environment variable injection)

### Security Tests

**Test Cases:**
- Wrong key rejection
- Corrupted file handling
- Version mismatch detection
- Replay attack simulation (reuse old .envx with new key)

## Performance Considerations

### Benchmarks (Apple M1, 2020)

| Operation | Time | Throughput |
|-----------|------|------------|
| Argon2id KDF | ~95ms | 10.5 keys/sec |
| scrypt KDF | ~150ms | 6.7 keys/sec |
| AES-256-GCM encrypt (1 KB) | ~0.1ms | 10k ops/sec |
| AES-256-GCM decrypt (1 KB) | ~0.1ms | 10k ops/sec |
| Full encrypt workflow (100 vars) | ~15ms | 66 files/sec |
| Full decrypt workflow (100 vars) | ~12ms | 83 files/sec |

### Optimization Strategies

1. **KDF caching:** Don't re-derive key for each operation (store in .envx.key)
2. **Parallel encryption:** Process multiple values concurrently (future enhancement)
3. **Streaming:** For large .env files (>1 MB), consider streaming parser
4. **Hardware acceleration:** AES-NI used automatically by OpenSSL

## Versioning and Migration

### File Format Evolution

**Current:** Version 1 (aes-256-gcm)

**Future Compatibility:**
```json
{
  "version": 2,
  "cipher": "chacha20-poly1305",
  "kdf": { "type": "balloon", ... }
}
```

**Migration Strategy:**
1. Decrypt with old version code
2. Re-encrypt with new version code
3. Update version number in file
4. Maintain backward compatibility for N-1 versions

**Version Detection:**
```typescript
if (parsed.version > SUPPORTED_VERSION) {
  throw new ValidationError(
    `Unsupported file version ${parsed.version}. Please upgrade envx.`
  );
}
```

## Future Enhancements

**Planned Features:**
1. **Multi-recipient encryption:** Different keys for different team members
2. **Hardware key support:** YubiKey, TPM, HSM integration
3. **Key splitting:** Shamir Secret Sharing for key backup
4. **Audit logging:** Track who accessed which secrets when
5. **Web UI:** Browser-based decryption tool (client-side crypto)
6. **Plugin system:** Custom KDF/cipher algorithms

---

**Document Version:** 1.0  
**Last Updated:** 2024-12-10  
**Maintained By:** Semicolon Systems Engineering Team
