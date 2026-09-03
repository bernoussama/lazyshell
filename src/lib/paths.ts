import path from 'path';
import os from 'os';

export const CONFIG_DIR = path.join(os.homedir(), '.lazyshell');
export const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
export const MODELS_DIR = path.join(CONFIG_DIR, 'models');
export const RUNTIME_DIR = path.join(CONFIG_DIR, 'runtime');

export const SKIP_BUNDLED_MODEL_ENV = 'LSH_SKIP_BUNDLED_MODEL';
export const SKIP_BUNDLED_MODEL_FLAG = '--skip-bundled-model';
export const BUNDLED_SERVER_PORT = 18765;
export const BUNDLED_SERVER_BASE_URL = `http://127.0.0.1:${BUNDLED_SERVER_PORT}/v1`;
export const OLLAMA_PROBE_URL = 'http://127.0.0.1:11434/api/tags';

export function shouldSkipBundledModelPrompt(
  env: NodeJS.ProcessEnv = process.env,
  argv: string[] = process.argv
): boolean {
  const skipEnv = env[SKIP_BUNDLED_MODEL_ENV];
  if (skipEnv === '1' || skipEnv === 'true') {
    return true;
  }
  return argv.includes(SKIP_BUNDLED_MODEL_FLAG);
}
