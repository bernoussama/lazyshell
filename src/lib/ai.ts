import { generateObject, generateText, type LanguageModel } from 'ai';
import os from 'os';
import z from 'zod';
import type { Config, ProviderKey } from './config';
import dedent from 'dedent';
import { getDistroPackageManager } from '../helpers/package-manager';
import { getHardwareInfo, type HardwareInfo } from '../helpers/hardware';
import { getModelFromRegistry } from './provider-registry';

export interface SystemInfo {
  platform: string;
  release: string;
  distro?: string;
  packageManager?: string;
  type: string;
  arch: string;
  hardware?: HardwareInfo;
}

export interface ModelConfig {
  provider: string;
  modelId: string;
  model: LanguageModel;
  temperature?: number;
  maxRetries?: number | undefined;
}

interface GenerationOptions {
  temperature?: number;
  systemPrompt?: string;
  maxTokens?: number;
}

function getLinuxDistro(): string | undefined {
  try {
    const osRelease = require('fs').readFileSync('/etc/os-release', 'utf8');
    const match = osRelease.match(/^NAME="?(.+?)"?$/m);
    return match ? match[1] : undefined;
  } catch {
    return undefined;
  }
}

export async function getSystemInfo(): Promise<SystemInfo> {
  const sysinfo: SystemInfo = {
    platform: os.platform(),
    release: os.release(),
    type: os.type(),
    arch: os.arch(),
  };
  if (os.platform() === 'linux') {
    sysinfo.distro = getLinuxDistro();
    sysinfo.packageManager = getDistroPackageManager();
    sysinfo.hardware = await getHardwareInfo();
  }
  return sysinfo;
}

export function getModelFromConfig(config: Config): ModelConfig {
  return getModelFromRegistry(config.provider, config.model, config.baseUrl, config.apiKey);
}

export function getDefaultModel(): ModelConfig {
  const envProviderMap: [string, ProviderKey][] = [
    ['GROQ_API_KEY', 'groq'],
    ['GOOGLE_GENERATIVE_AI_API_KEY', 'google'],
    ['OPENROUTER_API_KEY', 'openrouter'],
    ['ANTHROPIC_API_KEY', 'anthropic'],
    ['OPENAI_API_KEY', 'openai'],
  ];

  for (const [envVar, provider] of envProviderMap) {
    if (process.env[envVar]) {
      return getModelFromRegistry(provider);
    }
  }

  try {
    return getModelFromRegistry('ollama');
  } catch {
    throw new Error(
      'No API key found. Please set either GROQ_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, OPENROUTER_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY. Or setup Ollama/LM Studio'
    );
  }
}

export function getBenchmarkModels(): Record<string, LanguageModel> {
  return {
    'or-devstral': getModelFromRegistry('openrouter', 'mistralai/devstral-small:free').model,
    'gemini-2.0-flash-lite': getModelFromRegistry('google', 'gemini-2.0-flash-lite').model,
    'ollama3.2': getModelFromRegistry('ollama', 'llama3.2').model,
    'llama-3.3-70b-versatile': getModelFromRegistry('groq', 'llama-3.3-70b-versatile').model,
    devstral: getModelFromRegistry('mistral', 'devstral-small-2505').model,
    'lmstudio-llama': getModelFromRegistry('lmstudio', 'llama-3.2-1b').model,
    'openaiCompatible-gpt': getModelFromRegistry('openaiCompatible', 'gpt-3.5-turbo').model,
  };
}

async function generateTextWithModel(model: LanguageModel, prompt: string, options: GenerationOptions = {}) {
  const { temperature = 0, systemPrompt, maxTokens } = options;

  return generateText({
    model,
    temperature,
    prompt,
    ...(systemPrompt && { system: systemPrompt }),
    ...(maxTokens && { maxTokens }),
  });
}

const osInfo = await getSystemInfo();
const pwd = process.cwd();
const currentShell = os.platform() == 'win32' ? 'powershell' : process.env.SHELL || os.userInfo().shell || 'unknown';

const systemPrompt = dedent`You are an expert system administrator and command-line specialist.

SYSTEM CONTEXT:
- Platform: ${osInfo.platform}
- Architecture: ${osInfo.arch}
- Hardware:
  - CPU: ${osInfo.hardware?.cpu}
  - Memory: ${osInfo.hardware?.memory}
  - GPU: ${osInfo.hardware?.gpu}
${osInfo.distro ? `- Distribution: ${osInfo.distro}` : ''}
${osInfo.packageManager ? `- Package Manager: ${osInfo.packageManager}` : ''}
- Shell: ${currentShell}
- Working Directory: ${pwd}

CORE RESPONSIBILITIES:
1. Generate safe, correct, and efficient commands for the user's system
2. Adapt commands to the specific platform and available tools
3. Prioritize user safety and system integrity

OUTPUT REQUIREMENTS:
- Return ONLY the command string, no markdown, quotes, or additional formatting
- Use platform-appropriate syntax and flags
- Prefer relative paths over absolute paths when possible
- Include 'sudo' prefix ONLY when absolutely necessary for the operation

COMMAND GENERATION RULES:
1. If input is already a valid command for this system: return it unchanged
2. If input requests dangerous operations (system deletion, format, etc.): warn the user
3. If input is ambiguous: return "error: ambiguous request"
4. If input requests cross-platform translation: adapt to current system syntax
5. For package management: use detected package manager (${osInfo.packageManager || 'system default'})

SAFETY GUIDELINES:
- Warn the user if the command could damage the system
- Warn user about recursive deletions of system directories
- Be cautious and warn user with file permissions and ownership changes
- Validate that requested operations are reasonable and safe

PLATFORM-SPECIFIC ADAPTATIONS:
${
  osInfo.platform === 'linux'
    ? `- Use GNU/Linux command variants and flags
- Leverage ${osInfo.packageManager || 'available package manager'} for installations
- Consider distribution-specific paths and conventions`
    : ''
}
${
  osInfo.platform === 'darwin'
    ? `- Use macOS/BSD command variants
- Consider Homebrew for package management
- Use macOS-specific paths and conventions`
    : ''
}
${
  osInfo.platform === 'win32'
    ? `- Use PowerShell/Windows command syntax
- Consider Windows-specific paths and conventions
- Use appropriate Windows tools and utilities`
    : ''
}

Remember: Your primary goal is to be helpful while maintaining system safety and security.`;

const zCmd = z.object({
  command: z.string().describe('The command to execute, without any formatting or markdown'),
});
const zCmdExp = z.object({
  command: z.string().describe('The command to execute, without any formatting or markdown'),
  explanation: z.string().describe('Brief explanation of what the command does and why it was chosen'),
});

export type Command = z.infer<typeof zCmd>;
export type CommandWithExplanation = z.infer<typeof zCmdExp>;

export async function generateCommandStruct(
  prompt: string,
  modelConfig?: ModelConfig,
  explanation: boolean = false
): Promise<Command | CommandWithExplanation> {
  const modelConf = modelConfig || getDefaultModel();
  const schema = explanation ? zCmdExp : zCmd;

  try {
    const result = await generateObject({
      model: modelConf.model,
      system: systemPrompt,
      schema,
      prompt,
      temperature: modelConf.temperature || 0.1,
      maxRetries: modelConf.maxRetries || undefined,
    });
    return result.object;
  } catch {
    const result = await generateCommand(prompt, modelConf);
    return { command: result, explanation: '' };
  }
}

export async function generateCommand(prompt: string, modelConfig?: ModelConfig): Promise<string> {
  const finalModelConfig = modelConfig || getDefaultModel();

  const result = await generateTextWithModel(finalModelConfig.model, prompt, {
    temperature: finalModelConfig.temperature || 0.1,
    systemPrompt,
  });

  return result.text.trim();
}

export async function generateBenchmarkText(model: LanguageModel, prompt: string): Promise<string> {
  const result = await generateTextWithModel(model, prompt, {
    temperature: 0,
    systemPrompt,
  });

  return result.text.trim();
}

export const models = {
  groq: (modelId?: string, baseUrl?: string, apiKey?: string) =>
    getModelFromRegistry('groq', modelId, baseUrl, apiKey).model,
  google: (modelId?: string, baseUrl?: string, apiKey?: string) =>
    getModelFromRegistry('google', modelId, baseUrl, apiKey).model,
  openrouter: (modelId?: string, baseUrl?: string, apiKey?: string) =>
    getModelFromRegistry('openrouter', modelId, baseUrl, apiKey).model,
  anthropic: (modelId?: string, baseUrl?: string, apiKey?: string) =>
    getModelFromRegistry('anthropic', modelId, baseUrl, apiKey).model,
  openai: (modelId?: string, baseUrl?: string, apiKey?: string) =>
    getModelFromRegistry('openai', modelId, baseUrl, apiKey).model,
  ollama: (modelId?: string, baseUrl?: string, apiKey?: string) =>
    getModelFromRegistry('ollama', modelId, baseUrl, apiKey).model,
  mistral: (modelId?: string, baseUrl?: string, apiKey?: string) =>
    getModelFromRegistry('mistral', modelId, baseUrl, apiKey).model,
  lmstudio: (modelId?: string, baseUrl?: string, apiKey?: string) =>
    getModelFromRegistry('lmstudio', modelId, baseUrl, apiKey).model,
  openaiCompatible: (modelId?: string, baseUrl?: string, apiKey?: string) =>
    getModelFromRegistry('openaiCompatible', modelId, baseUrl, apiKey).model,
};
