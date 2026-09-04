import { describe, expect, test } from 'bun:test';
import { checksumMatches, hasCloudApiKey, sha256Buffer } from './bundled-model';
import { resolveLlamaCppRuntime } from './local-models';
import { SKIP_BUNDLED_MODEL_ENV, SKIP_BUNDLED_MODEL_FLAG, shouldSkipBundledModelPrompt } from './paths';

describe('shouldSkipBundledModelPrompt', () => {
  test('is false by default', () => {
    expect(shouldSkipBundledModelPrompt({}, ['node', 'lazyshell'])).toBe(false);
  });

  test('honors LSH_SKIP_BUNDLED_MODEL=1', () => {
    expect(shouldSkipBundledModelPrompt({ [SKIP_BUNDLED_MODEL_ENV]: '1' }, ['node', 'lazyshell'])).toBe(true);
  });

  test('honors LSH_SKIP_BUNDLED_MODEL=true', () => {
    expect(shouldSkipBundledModelPrompt({ [SKIP_BUNDLED_MODEL_ENV]: 'true' }, ['node', 'lazyshell'])).toBe(true);
  });

  test('honors --skip-bundled-model', () => {
    expect(shouldSkipBundledModelPrompt({}, ['node', 'lazyshell', SKIP_BUNDLED_MODEL_FLAG, 'list files'])).toBe(true);
  });
});

describe('checksum helpers', () => {
  test('sha256Buffer is stable hex', () => {
    expect(sha256Buffer('lazyshell')).toBe(sha256Buffer('lazyshell'));
    expect(sha256Buffer('lazyshell')).toHaveLength(64);
    expect(sha256Buffer('lazyshell')).not.toBe(sha256Buffer('other'));
  });

  test('checksumMatches is case-insensitive', () => {
    const digest = sha256Buffer('hello');
    expect(checksumMatches(digest, digest.toUpperCase())).toBe(true);
    expect(checksumMatches(digest, '00')).toBe(false);
  });
});

describe('resolveLlamaCppRuntime', () => {
  test('resolves linux x64', () => {
    const runtime = resolveLlamaCppRuntime('linux', 'x64');
    expect(runtime?.filename).toContain('ubuntu-x64');
    expect(runtime?.sha256).toHaveLength(64);
  });

  test('resolves macos arm64', () => {
    const runtime = resolveLlamaCppRuntime('darwin', 'arm64');
    expect(runtime?.filename).toContain('macos-arm64');
  });

  test('returns undefined for unsupported pairs', () => {
    expect(resolveLlamaCppRuntime('linux', 'ia32')).toBeUndefined();
  });
});

describe('hasCloudApiKey', () => {
  test('detects groq', () => {
    expect(hasCloudApiKey({ GROQ_API_KEY: 'abc' })).toBe(true);
    expect(hasCloudApiKey({})).toBe(false);
  });
});
