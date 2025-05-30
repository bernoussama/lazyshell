import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { select, password, cancel, isCancel } from '@clack/prompts';
import chalk from 'chalk';
import { version } from '../../package.json';
import { print } from '../utils';

// Supported AI providers
export const SUPPORTED_PROVIDERS = {
  groq: {
    name: 'Groq',
    description: 'Groq LLaMA models (fast inference)',
    envVar: 'GROQ_API_KEY',
    defaultModel: 'llama-3.3-70b-versatile',
  },
  google: {
    name: 'Google Gemini',
    description: 'Google AI Gemini models',
    envVar: 'GOOGLE_GENERATIVE_AI_API_KEY',
    defaultModel: 'gemini-2.0-flash-lite',
  },
  openrouter: {
    name: 'OpenRouter',
    description: 'OpenRouter API (multiple models)',
    envVar: 'OPENROUTER_API_KEY',
    defaultModel: 'meta-llama/llama-3.3-8b-instruct:free',
  },
  anthropic: {
    name: 'Anthropic Claude',
    description: 'Anthropic Claude models',
    envVar: 'ANTHROPIC_API_KEY',
    defaultModel: 'claude-3-5-haiku-latest',
  },
  openai: {
    name: 'OpenAI',
    description: 'OpenAI GPT models',
    envVar: 'OPENAI_API_KEY',
    defaultModel: 'gpt-4o-mini',
  },
  ollama: {
    name: 'Ollama (Local)',
    description: 'Local Ollama instance',
    envVar: null,
    defaultModel: 'llama3.2',
  },
  mistral: {
    name: 'Mistral',
    description: 'Mistral models',
    envVar: null,
    defaultModel: 'devstral-small-2505',
  },
  lmstudio: {
    name: 'LM Studio (Local)',
    description: 'Local LM Studio instance',
    envVar: null,
    defaultModel: 'llama-3.2-1b',
  },
} as const;

export type ProviderKey = keyof typeof SUPPORTED_PROVIDERS;

// Configuration interface
export interface Config {
  provider: ProviderKey;
  apiKey?: string;
  model?: string;
  version: string;
}

// Default configuration
const DEFAULT_CONFIG: Partial<Config> = {
  version: '1.0.0',
};

// Configuration file path
const CONFIG_DIR = path.join(os.homedir(), '.lazyshell');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

/**
 * Ensure config directory exists
 */
async function ensureConfigDir(): Promise<void> {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
  } catch (error) {
    console.error(chalk.red('Failed to create config directory:'), error);
    throw error;
  }
}

/**
 * Check if config file exists
 */
export async function configExists(): Promise<boolean> {
  try {
    await fs.access(CONFIG_FILE);
    return true;
  } catch {
    return false;
  }
}

/**
 * Load configuration from file
 */
export async function loadConfig(): Promise<Config | null> {
  try {
    const configData = await fs.readFile(CONFIG_FILE, 'utf-8');
    const config = JSON.parse(configData) as Config;

    // Validate config structure
    if (!config.provider || !SUPPORTED_PROVIDERS[config.provider]) {
      console.error(chalk.red('Invalid provider in config file'));
      return null;
    }

    return config;
  } catch (error) {
    console.error(chalk.red('Failed to load config:'), error);
    return null;
  }
}

/**
 * Save configuration to file
 */
export async function saveConfig(config: Config): Promise<boolean> {
  try {
    await ensureConfigDir();
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
    return true;
  } catch (error) {
    console.error(chalk.red('Failed to save config:'), error);
    return false;
  }
}

/**
 * Validate if a config is complete and ready to use
 */
export function validateConfig(config: Config): boolean {
  // Check if provider is valid
  if (!SUPPORTED_PROVIDERS[config.provider]) {
    return false;
  }

  // Ollama and LM Studio don't need an API key
  if (config.provider === 'ollama' || config.provider === 'lmstudio') {
    return true;
  }

  // All other providers need an API key
  return !!config.apiKey && config.apiKey.trim().length > 0;
}

/**
 * Prompt user to select a provider
 */
export async function promptProvider(): Promise<ProviderKey> {
  const options = Object.entries(SUPPORTED_PROVIDERS).map(([key, provider]) => ({
    name: `${provider.name} - ${provider.description}`,
    value: key as ProviderKey,
  }));

  const provider = await select({
    message: 'Select an AI provider:',
    options,
  });
  if (isCancel(provider)) {
    cancel('Provider selection cancelled');
    process.exit(0);
  }

  if (typeof provider === 'symbol') {
    throw new Error('Provider selection cancelled');
  }

  return provider;
}

/**
 * Prompt user to enter API key
 */
export async function promptApiKey(provider: ProviderKey): Promise<string | undefined> {
  const providerInfo = SUPPORTED_PROVIDERS[provider];

  // Ollama and LM Studio don't need an API key
  if (provider === 'ollama') {
    await print(chalk.green('Ollama selected - no API key required.'));
    return undefined;
  }

  if (provider === 'lmstudio') {
    await print(chalk.green('LM Studio selected - no API key required.'));
    return undefined;
  }

  await print(chalk.yellow(`\nYou'll need an API key for ${providerInfo.name}.`));

  if (providerInfo.envVar) {
    await print(chalk.gray(`Environment variable: ${providerInfo.envVar}`));
    const apiKey = getApiKeyFromEnv(provider);
    if (apiKey) {
      return apiKey;
    }
  }

  const apiKey = await password({
    message: `Enter your ${providerInfo.name} API key:`,
    mask: '*',
  });

  if (typeof apiKey === 'symbol') {
    throw new Error('apiKey entry cancelled');
  }

  return apiKey;
}

/**
 * Initialize configuration through user prompts
 */
export async function initializeConfig(): Promise<Config | null> {
  console.log(chalk.blue('\n🔧 Setting up LazyShell configuration...\n'));

  try {
    // Prompt for provider
    const provider = await promptProvider();

    // Prompt for API key
    const apiKey = await promptApiKey(provider);

    // Create config object
    const config: Config = {
      ...DEFAULT_CONFIG,
      provider,
      apiKey,
      model: SUPPORTED_PROVIDERS[provider].defaultModel,
      version,
    };

    // Save configuration
    const saved = await saveConfig(config);
    if (!saved) {
      console.error(chalk.red('Failed to save configuration'));
      return null;
    }

    console.log(chalk.green('\n✅ Configuration saved successfully!'));
    return config;
  } catch (error) {
    console.error(chalk.red('Failed to initialize configuration:'), error);
    return null;
  }
}

/**
 * Get configuration, prompting user if needed
 */
export async function getOrInitializeConfig(): Promise<Config | null> {
  // Check if config file exists
  if (await configExists()) {
    const config = await loadConfig();

    if (config && validateConfig(config)) {
      return config;
    } else {
      console.log(chalk.yellow('Configuration exists but is incomplete or invalid.'));
      return await initializeConfig();
    }
  } else {
    console.log(chalk.yellow('No configuration found.'));
    return await initializeConfig();
  }
}

/**
 * Check if API key is available from environment variables
 */
export function getApiKeyFromEnv(provider: ProviderKey): string | undefined {
  const providerInfo = SUPPORTED_PROVIDERS[provider];
  if (!providerInfo.envVar) {
    return undefined;
  }
  return process.env[providerInfo.envVar];
}

/**
 * Get the effective API key (config first, then environment)
 */
export function getEffectiveApiKey(config: Config): string | undefined {
  // Use config API key if available
  if (config.apiKey) {
    return config.apiKey;
  }

  // Fall back to environment variable
  return getApiKeyFromEnv(config.provider);
}
function iscancelled(provider: string | symbol) {
  throw new Error('Function not implemented.');
}
