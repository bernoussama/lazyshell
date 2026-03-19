import { describe, test, expect } from 'bun:test';
import { runCommand } from './utils';

describe('runCommand', () => {
  test('executes a simple command and resolves with exit code 0', async () => {
    const exitCode = await runCommand('echo hello');
    expect(exitCode).toBe(0);
  });

  test('resolves with non-zero exit code for failing commands', async () => {
    const exitCode = await runCommand('exit 1');
    expect(exitCode).toBe(1);
  });

  test('resolves with exit code 127 for unknown commands', async () => {
    const exitCode = await runCommand('nonexistent_command_abc123');
    expect(exitCode).toBe(127);
  });

  test('handles commands with arguments', async () => {
    const exitCode = await runCommand('echo "foo bar baz"');
    expect(exitCode).toBe(0);
  });

  test('handles piped commands', async () => {
    const exitCode = await runCommand('echo hello | cat');
    expect(exitCode).toBe(0);
  });
});
