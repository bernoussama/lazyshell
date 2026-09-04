export type PromptStyle = 'general' | 'commandOnly';
export type HardwareClass = 'cpu' | 'gpu';

export interface LocalCatalogEntry {
  id: string;
  lmstudioId: string;
  label: string;
  sizeHint: string;
  hardware: HardwareClass;
  promptStyle: PromptStyle;
  pullHint: string;
}

export interface DownloadArtifact {
  filename: string;
  url: string;
  sha256: string;
  sizeBytes: number;
}

export interface LlamaCppRuntimeArtifact extends DownloadArtifact {
  platform: NodeJS.Platform;
  arch: string;
}

export const OLLAMA_DEFAULT_MODEL = 'qwen2.5-coder:1.5b';
export const LMSTUDIO_DEFAULT_MODEL = 'qwen2.5-coder-1.5b-instruct';

export const LOCAL_MODEL_CATALOG: LocalCatalogEntry[] = [
  {
    id: 'qwen2.5-coder:0.5b',
    lmstudioId: 'qwen2.5-coder-0.5b-instruct',
    label: 'Qwen2.5-Coder 0.5B',
    sizeHint: '~400 MB',
    hardware: 'cpu',
    promptStyle: 'general',
    pullHint: 'ollama pull qwen2.5-coder:0.5b',
  },
  {
    id: 'qwen2.5-coder:1.5b',
    lmstudioId: 'qwen2.5-coder-1.5b-instruct',
    label: 'Qwen2.5-Coder 1.5B (recommended CPU)',
    sizeHint: '~1 GB',
    hardware: 'cpu',
    promptStyle: 'general',
    pullHint: 'ollama pull qwen2.5-coder:1.5b',
  },
  {
    id: 'hf.co/AryaYT/nl2shell-0.8b',
    lmstudioId: 'nl2shell-0.8b',
    label: 'NL2Shell 0.8B (command-only)',
    sizeHint: '~400 MB',
    hardware: 'cpu',
    promptStyle: 'commandOnly',
    pullHint: 'ollama pull hf.co/AryaYT/nl2shell-0.8b',
  },
  {
    id: 'qwen2.5-coder:3b',
    lmstudioId: 'qwen2.5-coder-3b-instruct',
    label: 'Qwen2.5-Coder 3B',
    sizeHint: '~2 GB',
    hardware: 'gpu',
    promptStyle: 'general',
    pullHint: 'ollama pull qwen2.5-coder:3b',
  },
  {
    id: 'qwen2.5-coder:7b',
    lmstudioId: 'qwen2.5-coder-7b-instruct',
    label: 'Qwen2.5-Coder 7B (recommended GPU)',
    sizeHint: '~4–5 GB',
    hardware: 'gpu',
    promptStyle: 'general',
    pullHint: 'ollama pull qwen2.5-coder:7b',
  },
  {
    id: 'westenfelder/NL2SH',
    lmstudioId: 'westenfelder-nl2sh',
    label: 'westenfelder NL2SH 7B (command-only)',
    sizeHint: '~6.2 GB',
    hardware: 'gpu',
    promptStyle: 'commandOnly',
    pullHint: 'ollama pull westenfelder/NL2SH',
  },
];

export const BUNDLED_MODEL = {
  id: 'qwen2.5-coder-0.5b-instruct-q4_k_m',
  displayName: 'Qwen2.5-Coder 0.5B Instruct (Q4_K_M)',
  license: 'Apache-2.0',
  version: 'qwen2.5-coder-0.5b-instruct-q4_k_m',
  filename: 'qwen2.5-coder-0.5b-instruct-q4_k_m.gguf',
  url: 'https://huggingface.co/Qwen/Qwen2.5-Coder-0.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-0.5b-instruct-q4_k_m.gguf',
  sha256: '1d9614638d18024d0fbb36575a15f1302a3adf044df10345688ec4f6e1c4ff32',
  sizeBytes: 491400064,
} as const;

const LLAMA_CPP_RELEASE = 'b10621';
const LLAMA_CPP_BASE = `https://github.com/ggml-org/llama.cpp/releases/download/${LLAMA_CPP_RELEASE}`;

export const LLAMA_CPP_RUNTIMES: LlamaCppRuntimeArtifact[] = [
  {
    platform: 'linux',
    arch: 'x64',
    filename: `llama-${LLAMA_CPP_RELEASE}-bin-ubuntu-x64.tar.gz`,
    url: `${LLAMA_CPP_BASE}/llama-${LLAMA_CPP_RELEASE}-bin-ubuntu-x64.tar.gz`,
    sha256: '91d7b03ddae498a39f28fdb85d84d2b4a0fd3838d10b4f897e0ef8975bb9b583',
    sizeBytes: 16291771,
  },
  {
    platform: 'linux',
    arch: 'arm64',
    filename: `llama-${LLAMA_CPP_RELEASE}-bin-ubuntu-arm64.tar.gz`,
    url: `${LLAMA_CPP_BASE}/llama-${LLAMA_CPP_RELEASE}-bin-ubuntu-arm64.tar.gz`,
    sha256: '95940151be63492f70f659da420b268244cc83a6ee70e310d2600ccdb7ea4deb',
    sizeBytes: 13043001,
  },
  {
    platform: 'darwin',
    arch: 'arm64',
    filename: `llama-${LLAMA_CPP_RELEASE}-bin-macos-arm64.tar.gz`,
    url: `${LLAMA_CPP_BASE}/llama-${LLAMA_CPP_RELEASE}-bin-macos-arm64.tar.gz`,
    sha256: '429c8270608600188035e5e92f7d78dffb7900904fe7dd7e6a84f48068cd13cf',
    sizeBytes: 10954823,
  },
  {
    platform: 'darwin',
    arch: 'x64',
    filename: `llama-${LLAMA_CPP_RELEASE}-bin-macos-x64.tar.gz`,
    url: `${LLAMA_CPP_BASE}/llama-${LLAMA_CPP_RELEASE}-bin-macos-x64.tar.gz`,
    sha256: '33c44e036e0e223f71a29fc74a0ab3e130ca9eadeb032ecc1c7af25985b8b91b',
    sizeBytes: 11034240,
  },
  {
    platform: 'win32',
    arch: 'x64',
    filename: `llama-${LLAMA_CPP_RELEASE}-bin-win-cpu-x64.zip`,
    url: `${LLAMA_CPP_BASE}/llama-${LLAMA_CPP_RELEASE}-bin-win-cpu-x64.zip`,
    sha256: '0e8b65e650e369f70f8307d890508886f171ef4fb00facccddd4a1b7ffdaca51',
    sizeBytes: 18068018,
  },
  {
    platform: 'win32',
    arch: 'arm64',
    filename: `llama-${LLAMA_CPP_RELEASE}-bin-win-cpu-arm64.zip`,
    url: `${LLAMA_CPP_BASE}/llama-${LLAMA_CPP_RELEASE}-bin-win-cpu-arm64.zip`,
    sha256: 'c072e8bb057751587243c1e0ed28d82e23c7e0544a426e0d476f1e77792bf3ce',
    sizeBytes: 11846656,
  },
];

export function catalogModelId(entry: LocalCatalogEntry, provider: 'ollama' | 'lmstudio'): string {
  return provider === 'lmstudio' ? entry.lmstudioId : entry.id;
}

export function resolveLlamaCppRuntime(
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch
): LlamaCppRuntimeArtifact | undefined {
  return LLAMA_CPP_RUNTIMES.find(runtime => runtime.platform === platform && runtime.arch === arch);
}
