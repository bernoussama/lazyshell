import { describe, test, expect } from 'bun:test';
import { Command } from 'commander';

function createProgram() {
  const program = new Command();
  program
    .argument('<prompt_parts...>', 'prompt')
    .option('-e, --explain', 'show explanation of the generated command')
    .option('-c, --confirm', 'ask for confirmation before running the command')
    .exitOverride()
    .action(() => {});

  return program;
}

describe('CLI flag parsing', () => {
  test('parses prompt without flags', () => {
    const program = createProgram();
    program.parse(['node', 'lsh', 'list', 'files']);

    expect(program.args).toEqual(['list', 'files']);
    expect(program.opts()).toEqual({});
  });

  test('parses --explain flag', () => {
    const program = createProgram();
    program.parse(['node', 'lsh', '--explain', 'list', 'files']);

    expect(program.opts().explain).toBe(true);
  });

  test('parses -e short flag', () => {
    const program = createProgram();
    program.parse(['node', 'lsh', '-e', 'list', 'files']);

    expect(program.opts().explain).toBe(true);
  });

  test('parses --confirm flag', () => {
    const program = createProgram();
    program.parse(['node', 'lsh', '--confirm', 'list', 'files']);

    expect(program.opts().confirm).toBe(true);
  });

  test('parses -c short flag', () => {
    const program = createProgram();
    program.parse(['node', 'lsh', '-c', 'list', 'files']);

    expect(program.opts().confirm).toBe(true);
  });

  test('parses both -e and -c together', () => {
    const program = createProgram();
    program.parse(['node', 'lsh', '-e', '-c', 'list', 'files']);

    const opts = program.opts();
    expect(opts.explain).toBe(true);
    expect(opts.confirm).toBe(true);
  });

  test('explain and confirm default to undefined (falsy)', () => {
    const program = createProgram();
    program.parse(['node', 'lsh', 'hello']);

    const opts = program.opts();
    expect(opts.explain).toBeUndefined();
    expect(opts.confirm).toBeUndefined();
  });

  test('flags work with multi-word prompts', () => {
    const program = createProgram();
    program.parse(['node', 'lsh', '-e', '-c', 'find', 'all', 'js', 'files']);

    expect(program.opts().explain).toBe(true);
    expect(program.opts().confirm).toBe(true);
    expect(program.args).toEqual(['find', 'all', 'js', 'files']);
  });
});
