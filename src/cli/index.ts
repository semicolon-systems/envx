#!/usr/bin/env node
import { program } from 'commander';
import { version } from '../../package.json';
import { initCommand } from './commands/init';
import { encryptCommand } from './commands/encrypt';
import { decryptCommand } from './commands/decrypt';
import { showCommand } from './commands/show';
import { runCommand } from './commands/run';
import { rotateCommand } from './commands/rotate';
import { verifyCommand } from './commands/verify';
import { checkCommand } from './commands/check';
import { exportVarsCommand } from './commands/export-vars';

program.version(version);

program
  .command('init')
  .option('-m, --mode <mode>', 'random or password', 'random')
  .option('-k, --key <path>', 'key file path', '.envx.key')
  .description('Initialize a new envx project')
  .action((opts: { mode: string; key: string }) => {
    void initCommand(opts.mode, opts.key);
  });

program
  .command('encrypt <file>')
  .option('-o, --output <path>', 'output path')
  .option('-k, --key <path>', 'key file path', '.envx.key')
  .description('Encrypt a .env file')
  .action((file: string, opts: { output?: string; key: string }) => {
    void encryptCommand(file, opts.output, opts.key);
  });

program
  .command('decrypt <file>')
  .option('-k, --key <path>', 'key file path', '.envx.key')
  .option('-w, --write', 'write to disk (unsafe)', false)
  .description('Decrypt an .envx file')
  .action((file: string, opts: { key: string; write: boolean }) => {
    void decryptCommand(file, opts.key, opts.write);
  });

program
  .command('show <file>')
  .option('-k, --key <path>', 'key file path', '.envx.key')
  .description('Show decrypted values (no disk write)')
  .action((file: string, opts: { key: string }) => {
    void showCommand(file, opts.key);
  });

program
  .command('run')
  .option('-k, --key <path>', 'key file path', '.envx.key')
  .option('-e, --envx <path>', 'envx file path', '.envx')
  .argument('[command...]', 'command to run with environment variables')
  .description('Run command with decrypted env vars')
  .allowUnknownOption(true)
  .action((cmdArgs: string[], opts: { key: string; envx: string }) => {
    // If no command args, show error
    if (!cmdArgs || cmdArgs.length === 0) {
      console.error('Error: No command specified');
      console.error('Usage: envx run [options] <command> [args...]');
      process.exit(1);
    }
    void runCommand(cmdArgs, opts.key, opts.envx);
  });

program
  .command('rotate <new-key>')
  .option('-k, --key <path>', 'current key file path', '.envx.key')
  .option('-e, --envx <path>', 'envx file path', '.envx')
  .description('Rotate to new key')
  .action((newKey: string, opts: { key: string; envx: string }) => {
    void rotateCommand(newKey, opts.key, opts.envx);
  });

program
  .command('verify <file>')
  .description('Verify envx file integrity')
  .action((file: string) => {
    void verifyCommand(file);
  });

program
  .command('check <file>')
  .option('-s, --schema <path>', 'schema file path')
  .description('Validate against schema')
  .action((file: string, opts: { schema?: string }) => {
    void checkCommand(file, opts.schema);
  });

program
  .command('export-vars <file>')
  .option('-k, --key <path>', 'key file path', '.envx.key')
  .description('Export as KEY=VALUE')
  .action((file: string, opts: { key: string }) => {
    void exportVarsCommand(file, opts.key);
  });

program.parse(process.argv);

if (process.argv.length < 3) {
  program.outputHelp();
}
