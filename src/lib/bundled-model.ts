import { createHash } from 'crypto';
import { createWriteStream } from 'fs';
import { spawn, execFile, type ChildProcess } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { BUNDLED_MODEL, resolveLlamaCppRuntime, type DownloadArtifact } from './local-models';
import { BUNDLED_SERVER_BASE_URL, BUNDLED_SERVER_PORT, MODELS_DIR, OLLAMA_PROBE_URL, RUNTIME_DIR } from './paths';

const execFileAsync = promisify(execFile);

export type ProgressCallback = (downloaded: number, total: number) => void;

let serverProcess: ChildProcess | undefined;
let serverReady: Promise<string> | undefined;

export function bundledModelPath(): string {
  return path.join(MODELS_DIR, BUNDLED_MODEL.filename);
}

export function llamaRuntimeDir(): string {
  return path.join(RUNTIME_DIR, 'llama.cpp');
}

export function sha256Buffer(data: Buffer | string): string {
  return createHash('sha256').update(data).digest('hex');
}

export async function sha256File(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  const file = await fs.open(filePath, 'r');
  try {
    const stream = file.createReadStream();
    for await (const chunk of stream) {
      hash.update(chunk as Buffer);
    }
  } finally {
    await file.close();
  }
  return hash.digest('hex');
}

export function checksumMatches(actual: string, expected: string): boolean {
  return actual.toLowerCase() === expected.toLowerCase();
}

export async function isOllamaReachable(probeUrl = OLLAMA_PROBE_URL, timeoutMs = 500): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(probeUrl, { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export async function isBundledModelInstalled(): Promise<boolean> {
  try {
    const stats = await fs.stat(bundledModelPath());
    if (!stats.isFile() || stats.size !== BUNDLED_MODEL.sizeBytes) {
      return false;
    }
    const digest = await sha256File(bundledModelPath());
    return checksumMatches(digest, BUNDLED_MODEL.sha256);
  } catch {
    return false;
  }
}

export async function downloadFile(
  artifact: DownloadArtifact,
  destPath: string,
  onProgress?: ProgressCallback
): Promise<void> {
  await fs.mkdir(path.dirname(destPath), { recursive: true });
  const tempPath = `${destPath}.partial`;

  const response = await fetch(artifact.url, { redirect: 'follow' });
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${artifact.filename}: HTTP ${response.status}`);
  }

  const total = Number(response.headers.get('content-length')) || artifact.sizeBytes;
  const reader = response.body.getReader();
  const output = createWriteStream(tempPath);
  const hash = createHash('sha256');
  let downloaded = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      hash.update(value);
      downloaded += value.byteLength;
      await new Promise<void>((resolve, reject) => {
        output.write(value, error => (error ? reject(error) : resolve()));
      });
      onProgress?.(downloaded, total);
    }
  } finally {
    await new Promise<void>(resolve => output.end(() => resolve()));
  }

  const digest = hash.digest('hex');
  if (!checksumMatches(digest, artifact.sha256)) {
    await fs.rm(tempPath, { force: true });
    throw new Error(`Checksum mismatch for ${artifact.filename}`);
  }

  await fs.rename(tempPath, destPath);
}

export async function installBundledModel(onProgress?: ProgressCallback): Promise<void> {
  if (await isBundledModelInstalled()) {
    return;
  }
  await downloadFile(BUNDLED_MODEL, bundledModelPath(), onProgress);
}

export async function removeBundledModel(): Promise<void> {
  await stopBundledServer();
  await fs.rm(bundledModelPath(), { force: true });
  await fs.rm(`${bundledModelPath()}.partial`, { force: true });
}

async function findLlamaServerBinary(root: string): Promise<string | undefined> {
  const names = new Set(['llama-server', 'llama-server.exe']);
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      break;
    }
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (names.has(entry.name)) {
        return full;
      }
    }
  }
  return undefined;
}

export async function ensureLlamaCppRuntime(onProgress?: ProgressCallback): Promise<string> {
  const runtime = resolveLlamaCppRuntime();
  if (!runtime) {
    throw new Error(`No llama.cpp binary is published for ${process.platform}/${process.arch}`);
  }

  const extractDir = llamaRuntimeDir();
  const existing = await findLlamaServerBinary(extractDir);
  if (existing) {
    return existing;
  }

  await fs.mkdir(extractDir, { recursive: true });
  const archivePath = path.join(RUNTIME_DIR, runtime.filename);
  await downloadFile(runtime, archivePath, onProgress);

  if (runtime.filename.endsWith('.zip')) {
    await execFileAsync('tar', ['-xf', archivePath, '-C', extractDir]);
  } else {
    await execFileAsync('tar', ['-xzf', archivePath, '-C', extractDir]);
  }

  const binary = await findLlamaServerBinary(extractDir);
  if (!binary) {
    throw new Error('llama-server was not found in the downloaded runtime archive');
  }
  await fs.chmod(binary, 0o755).catch(() => undefined);
  return binary;
}

async function waitForServer(url: string, timeoutMs = 60_000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // server not up yet
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('Bundled llama-server did not become ready in time');
}

export async function stopBundledServer(): Promise<void> {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
  }
  serverProcess = undefined;
  serverReady = undefined;
}

export async function ensureBundledServer(onProgress?: ProgressCallback): Promise<string> {
  if (serverReady) {
    return serverReady;
  }

  serverReady = (async () => {
    if (await isOllamaReachable(`http://127.0.0.1:${BUNDLED_SERVER_PORT}/health`, 250)) {
      return BUNDLED_SERVER_BASE_URL;
    }

    if (!(await isBundledModelInstalled())) {
      throw new Error('Bundled model is not installed. Run `lazyshell model install`.');
    }

    const binary = await ensureLlamaCppRuntime(onProgress);
    serverProcess = spawn(
      binary,
      [
        '-m',
        bundledModelPath(),
        '-a',
        BUNDLED_MODEL.id,
        '--host',
        '127.0.0.1',
        '--port',
        String(BUNDLED_SERVER_PORT),
        '-c',
        '4096',
      ],
      { stdio: 'ignore', detached: false }
    );
    serverProcess.on('exit', () => {
      serverProcess = undefined;
      serverReady = undefined;
    });

    await waitForServer(`http://127.0.0.1:${BUNDLED_SERVER_PORT}/health`);
    return BUNDLED_SERVER_BASE_URL;
  })();

  try {
    return await serverReady;
  } catch (error) {
    serverReady = undefined;
    throw error;
  }
}

export function hasCloudApiKey(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(
    env.GROQ_API_KEY ||
      env.GOOGLE_GENERATIVE_AI_API_KEY ||
      env.OPENROUTER_API_KEY ||
      env.ANTHROPIC_API_KEY ||
      env.OPENAI_API_KEY ||
      env.MISTRAL_API_KEY
  );
}
