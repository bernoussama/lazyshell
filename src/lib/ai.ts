import { generateObject, generateText, type LanguageModel } from 'ai';
import { groq } from '@ai-sdk/groq';
import { google } from '@ai-sdk/google';
import { ollama } from 'ollama-ai-provider';
import { openrouter } from '@openrouter/ai-sdk-provider';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import os from 'os';
import z from 'zod';
import type { Config, ProviderKey } from './config';
import { mistral } from '@ai-sdk/mistral';
import dedent from 'dedent';
import { getDistroPackageManager } from '../helpers/package-manager';
import { getHardwareInfo, type HardwareInfo } from '../helpers/hardware';

// Provider configuration interface
interface BaseProviderConfig {
  defaultModel: string;
  createModel: (...args: any[]) => LanguageModel;
  benchmarkModel?: string;
  maxRetries?: number;
  envKey?: string;
  defaultBaseUrl?: string;
}

// Centralized provider and model configuration
const PROVIDER_CONFIG: Record<ProviderKey, BaseProviderConfig> = {
  groq: {
    defaultModel: 'llama-3.3-70b-versatile',
    envKey: 'GROQ_API_KEY',
    createModel: (modelId: string) => groq(modelId),
    benchmarkModel: 'llama-3.3-70b-versatile',
  },
  google: {
    defaultModel: 'gemini-2.0-flash-lite',
    envKey: 'GOOGLE_GENERATIVE_AI_API_KEY',
    createModel: (modelId: string) => google(modelId),
    benchmarkModel: 'gemini-2.0-flash-lite',
  },
  openrouter: {
    defaultModel: 'google/gemini-2.0-flash-001',
    envKey: 'OPENROUTER_API_KEY',
    createModel: (modelId: string) => openrouter(modelId),
    benchmarkModel: 'mistralai/devstral-small:free',
  },
  anthropic: {
    defaultModel: 'claude-3-5-haiku-latest',
    envKey: 'ANTHROPIC_API_KEY',
    createModel: (modelId: string) => anthropic(modelId),
  },
  openai: {
    defaultModel: 'gpt-4o-mini',
    envKey: 'OPENAI_API_KEY',
    createModel: (modelId: string) => openai(modelId),
  },
  ollama: {
    defaultModel: 'llama3.2',
    createModel: (modelId: string) => ollama(modelId),
    maxRetries: 1,
    benchmarkModel: 'llama3.2',
  },
  mistral: {
    defaultModel: 'devstral-small-2505',
    createModel: (modelId: string) => mistral(modelId),
    benchmarkModel: 'devstral-small-2505',
  },
  lmstudio: {
    defaultModel: 'deepseek/deepseek-r1-0528-qwen3-8b',
    defaultBaseUrl: 'http://localhost:1234/v1',
    createModel: (modelId: string, baseUrl?: string) => {
      const lmstudio = createOpenAICompatible({
        name: 'lmstudio',
        baseURL: baseUrl || 'http://localhost:1234/v1',
      });
      return lmstudio(modelId);
    },
    maxRetries: 1,
    benchmarkModel: 'llama-3.2-1b',
  },
  openaiCompatible: {
    defaultModel: 'gpt-3.5-turbo',
    defaultBaseUrl: 'http://localhost:8000/v1',
    envKey: 'OPENAI_COMPATIBLE_API_KEY',
    createModel: (modelId: string, baseUrl?: string, apiKey?: string) => {
      const openaiCompatible = createOpenAICompatible({
        name: 'openaiCompatible',
        baseURL: baseUrl || 'http://localhost:8000/v1',
        apiKey: apiKey,
      });
      return openaiCompatible(modelId);
    },
    maxRetries: 1,
    benchmarkModel: 'gpt-3.5-turbo',
  },
};

// Provider priority order for auto-detection
const PROVIDER_PRIORITY: ProviderKey[] = ['groq', 'google', 'openrouter', 'anthropic', 'openai', 'ollama'];

// System information interface
export interface SystemInfo {
  platform: string;
  release: string;
  distro?: string; // Only for Linux
  packageManager?: string; // Only for Linux
  type: string;
  arch: string;
  hardware?: HardwareInfo; // Hardware info for Linux systems
}

// Model configuration interface
export interface ModelConfig {
  provider: string;
  modelId: string;
  model: LanguageModel;
  temperature?: number;
  maxRetries?: number | undefined;
}

// Text generation options
export interface GenerationOptions {
  temperature?: number;
  systemPrompt?: string;
  maxTokens?: number;
}

// Simple function to get Linux distro name from /etc/os-release
function getLinuxDistro(): string | undefined {
  try {
    const osRelease = require('fs').readFileSync('/etc/os-release', 'utf8');
    const match = osRelease.match(/^NAME="?(.+?)"?$/m);
    return match ? match[1] : undefined;
  } catch {
    return undefined;
  }
}

// Get system information for context
export async function getSystemInfo(): Promise<SystemInfo> {
  const sysinfo: SystemInfo = {
    platform: os.platform(),
    release: os.release(),
    type: os.type(),
    arch: os.arch(),
  };
  if (os.platform() === 'linux') {
    sysinfo.distro = getLinuxDistro(); // Get Linux distribution name simply
    sysinfo.packageManager = getDistroPackageManager();
    sysinfo.hardware = await getHardwareInfo();
  }
  return sysinfo;
}

// Get model based on configuration
export function getModelFromConfig(config: Config): ModelConfig {
  const provider = config.provider;
  const modelId = config.model || getDefaultModelId(provider);
  const apiKey = config.apiKey;
  const providerConfig = PROVIDER_CONFIG[provider];

  if (!providerConfig) {
    throw new Error(`Unsupported provider: ${provider}`);
  }

  let model: LanguageModel;
  let maxRetries: number | undefined = providerConfig.maxRetries;

  try {
    // Handle API key validation for providers that need it
    if (providerConfig.envKey && !apiKey && !process.env[providerConfig.envKey]) {
      throw new Error(`${provider} API key is required`);
    }

    // Set environment variable if API key is provided
    if (providerConfig.envKey && apiKey) {
      process.env[providerConfig.envKey] = apiKey;
    }

    // Create model based on provider type
    if (provider === 'lmstudio') {
      const baseUrl = config.baseUrl || providerConfig.defaultBaseUrl || 'http://localhost:1234/v1';
      model = providerConfig.createModel(modelId, baseUrl);
    } else if (provider === 'openaiCompatible') {
      const baseUrl = config.baseUrl || providerConfig.defaultBaseUrl || 'http://localhost:8000/v1';
      if (apiKey) {
        process.env.OPENAI_COMPATIBLE_API_KEY = apiKey;
      }
      model = providerConfig.createModel(modelId, baseUrl, apiKey || process.env.OPENAI_COMPATIBLE_API_KEY);
    } else {
      model = providerConfig.createModel(modelId);
    }

    return { provider, modelId, model, maxRetries };
  } catch (error) {
    throw new Error(`Failed to initialize ${provider} model: ${error}`);
  }
}

// Get default model ID for a provider
function getDefaultModelId(provider: ProviderKey): string {
  const providerConfig = PROVIDER_CONFIG[provider];
  if (!providerConfig) {
    throw new Error(`Unsupported provider: ${provider}`);
  }
  return providerConfig.defaultModel;
}

// Get available model based on environment variables (legacy function)
export function getDefaultModel(): ModelConfig {
  // Try providers in priority order based on available API keys
  for (const provider of PROVIDER_PRIORITY) {
    const providerConfig = PROVIDER_CONFIG[provider];
    
    // Skip providers that require API keys if none is available
    if (providerConfig.envKey && !process.env[providerConfig.envKey]) {
      continue;
    }

    try {
      const modelId = providerConfig.defaultModel;
      const model = providerConfig.createModel(modelId);
      return { 
        provider, 
        modelId, 
        model,
        maxRetries: providerConfig.maxRetries
      };
    } catch (error) {
      continue; // Try next provider
    }
  }

  // Fallback to ollama if no API keys are available
  try {
    const provider = 'ollama';
    const providerConfig = PROVIDER_CONFIG[provider];
    const modelId = providerConfig.defaultModel;
    const model = providerConfig.createModel(modelId);
    return { 
      provider, 
      modelId, 
      model,
      maxRetries: providerConfig.maxRetries
    };
  } catch (error) {
    throw new Error(
      'No API key found. Please set either GROQ_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, OPENROUTER_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY. Or setup Ollama/LM Studio'
    );
  }
}

// Get predefined models for benchmarking
export function getBenchmarkModels(): Record<string, LanguageModel> {
  const benchmarkModels: Record<string, LanguageModel> = {};

  // Add benchmark models from provider config
  Object.entries(PROVIDER_CONFIG).forEach(([provider, config]) => {
    if (config.benchmarkModel) {
      const key = provider === 'openrouter' ? 'or-devstral' : 
                  provider === 'ollama' ? 'ollama3.2' :
                  provider === 'lmstudio' ? 'lmstudio-llama' :
                  provider === 'openaiCompatible' ? 'openaiCompatible-gpt' :
                  config.benchmarkModel;

      if (provider === 'lmstudio') {
        benchmarkModels[key] = config.createModel(config.benchmarkModel);
      } else if (provider === 'openaiCompatible') {
        benchmarkModels[key] = config.createModel(config.benchmarkModel);
      } else {
        benchmarkModels[key] = config.createModel(config.benchmarkModel);
      }
    }
  });

  return benchmarkModels;
}

// Generate text with a model
export async function generateTextWithModel(model: LanguageModel, prompt: string, options: GenerationOptions = {}) {
  const { temperature = 0, systemPrompt, maxTokens } = options;

  const generateOptions: any = {
    model,
    temperature,
    prompt,
  };

  if (systemPrompt) {
    generateOptions.system = systemPrompt;
  }

  if (maxTokens) {
    generateOptions.maxTokens = maxTokens;
  }

  return await generateText(generateOptions);
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
  explanation: boolean = true
): Promise<Command | CommandWithExplanation> {
  const modelConf = modelConfig || getDefaultModel();
  let zShema;
  if (explanation) {
    zShema = zCmdExp;
  } else {
    zShema = zCmd;
  }
  try {
    const result = await generateObject({
      model: modelConf.model,
      system: systemPrompt,
      schema: zShema,
      prompt,
      temperature: modelConf.temperature || 0.1,
      maxRetries: modelConf.maxRetries || undefined,
    });
    return result.object;
  } catch (error) {
    const result = await generateCommand(prompt, modelConf);
    return { command: result, explanation: '' };
  }
}

// Generate command using the default model with system admin context
export async function generateCommand(prompt: string, modelConfig?: ModelConfig): Promise<string> {
  const finalModelConfig = modelConfig || getDefaultModel();

  const result = await generateTextWithModel(finalModelConfig.model, prompt, {
    temperature: finalModelConfig.temperature || 0.1,
    systemPrompt,
  });

  return result.text.trim();
}

// Generate text for benchmarking with simple system prompt
export async function generateBenchmarkText(model: LanguageModel, prompt: string): Promise<string> {
  const result = await generateTextWithModel(model, prompt, {
    temperature: 0,
    systemPrompt,
  });

  return result.text.trim();
}

// Export model instances for direct use - using consolidated config
export const models = Object.entries(PROVIDER_CONFIG).reduce((acc, [provider, config]) => {
  acc[provider as ProviderKey] = (modelId?: string, ...args: any[]) => {
    const finalModelId = modelId || config.defaultModel;
    return config.createModel(finalModelId, ...args);
  };
  return acc;
}, {} as Record<ProviderKey, (modelId?: string, ...args: any[]) => LanguageModel>);
