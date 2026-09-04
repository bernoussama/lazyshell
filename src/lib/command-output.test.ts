import { describe, expect, test } from 'bun:test';
import { extractCommand, usesCompactPrompt } from './command-output';

describe('extractCommand', () => {
  test('returns a bare command', () => {
    expect(extractCommand('ls -la')).toBe('ls -la');
  });

  test('unwraps markdown fences', () => {
    expect(extractCommand('```bash\npwd\n```')).toBe('pwd');
  });

  test('takes the command from a fenced block after prose', () => {
    expect(extractCommand('Use this:\n```bash\nfind . -name "*.js"\n```\nDone.')).toBe('find . -name "*.js"');
  });

  test('strips Command: prefix and backticks', () => {
    expect(extractCommand('Command: `uname -a`')).toBe('uname -a');
  });
});

describe('usesCompactPrompt', () => {
  test('is true for bundled and tiny coder ids', () => {
    expect(usesCompactPrompt('bundled', 'anything')).toBe(true);
    expect(usesCompactPrompt('ollama', 'qwen2.5-coder:0.5b')).toBe(true);
    expect(usesCompactPrompt('groq', 'openai/gpt-oss-120b')).toBe(false);
  });
});
