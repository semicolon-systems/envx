const { Envx } = require('./dist/lib/envx.js');
const { writeFileSync, unlinkSync, mkdirSync, rmSync, existsSync } = require('fs');
const { randomBytes } = require('crypto');

async function benchmark() {
  const tempDir = '/tmp/envx-benchmark-' + randomBytes(8).toString('hex');
  const keyPath = `${tempDir}/.envx.key`;
  const envPath = `${tempDir}/.env`;
  const envxPath = `${tempDir}/.envx`;

  try {
    mkdirSync(tempDir, { recursive: true });

    const envx = new Envx(keyPath);
    await envx.init('random');

    console.log('=== Performance Benchmarks ===\n');

    const testSizes = [
      { name: '10 keys', count: 10 },
      { name: '100 keys', count: 100 },
      { name: '1000 keys', count: 1000 },
    ];

    for (const test of testSizes) {
      const envContent = Array.from({ length: test.count }, (_, i) => {
        return `KEY_${i}=value_${i}_${'x'.repeat(50)}`;
      }).join('\n');

      writeFileSync(envPath, envContent);

      const encryptStart = Date.now();
      await envx.encrypt(envPath, envxPath);
      const encryptTime = Date.now() - encryptStart;

      const decryptStart = Date.now();
      await envx.decrypt(envxPath);
      const decryptTime = Date.now() - decryptStart;

      console.log(`${test.name}:`);
      console.log(`  Encrypt: ${encryptTime}ms`);
      console.log(`  Decrypt: ${decryptTime}ms`);
      console.log();

      unlinkSync(envxPath);
    }

    const longValue = 'x'.repeat(1000000);
    writeFileSync(envPath, `LARGE_VALUE=${longValue}`);

    const encryptStart = Date.now();
    await envx.encrypt(envPath, envxPath);
    const encryptTime = Date.now() - encryptStart;

    const decryptStart = Date.now();
    await envx.decrypt(envxPath);
    const decryptTime = Date.now() - decryptStart;

    console.log('1MB value:');
    console.log(`  Encrypt: ${encryptTime}ms`);
    console.log(`  Decrypt: ${decryptTime}ms`);
    console.log();

    const memUsage = process.memoryUsage();
    console.log('Memory Usage:');
    console.log(`  RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB`);
    console.log(`  Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
    console.log(`  Heap Total: ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`);
  } catch (error) {
    console.error('Benchmark failed:', error);
    process.exit(1);
  } finally {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

benchmark().catch((err) => {
  console.error(err);
  process.exit(1);
});
