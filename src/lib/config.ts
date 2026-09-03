import fs from 'fs/promises';
import { confirm, password, select, text, cancel, isCancel } from '@clack/prompts';
import chalk from 'chalk';
import { version } from '../../package.json';
import { print } from '../utils';
import { installBundledModel, isBundledModelInstalled, isOllamaReachable, hasCloudApiKey } from './bundled-model';
import {
  BUNDLED_MODEL,
  LMSTUDIO_DEFAULT_MODEL,
  LOCAL_MODEL_CATALOG,
  OLLAMA_DEFAULT_MODEL,
  catalogModelId,
} from './local-models';
import { CONFIG_DIR, CONFIG_FILE, shouldSkipBundledModelPrompt } from './paths';

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
    defaultModel: 'google/gemini-2.0-flash-001',
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
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
  bundled: {
    name: 'Bundled (Local)',
    description: 'Built-in Qwen2.5-Coder 0.5B (~469 MB, no Ollama required)',
    envVar: null,
    defaultModel: BUNDLED_MODEL.id,
    defaultBaseUrl: 'http://127.0.0.1:18765/v1',
  },
  ollama: {
    name: 'Ollama (Local)',
    description: 'Local Ollama instance',
    envVar: null,
    defaultModel: OLLAMA_DEFAULT_MODEL,
  },
  mistral: {
    name: 'Mistral',
    description: 'Mistral models',
    envVar: 'MISTRAL_API_KEY',
    defaultModel: 'devstral-small-2505',
    defaultBaseUrl: 'https://api.mistral.ai/v1',
  },
  lmstudio: {
    name: 'LM Studio (Local)',
    description: 'Local LM Studio instance',
    envVar: null,
    defaultModel: LMSTUDIO_DEFAULT_MODEL,
    defaultBaseUrl: 'http://localhost:1234/v1',
    supportsCustomBaseUrl: true,
  },
  openaiCompatible: {
    name: 'OpenAI Compatible',
    description: 'Any OpenAI-compatible API endpoint',
    envVar: 'OPENAI_COMPATIBLE_API_KEY',
    defaultModel: 'gpt-3.5-turbo',
    defaultBaseUrl: 'http://localhost:8000/v1',
    supportsCustomBaseUrl: true,
  },
} as const;

export type ProviderKey = keyof typeof SUPPORTED_PROVIDERS;

export type BundledModelStatus = 'installed' | 'declined' | 'skipped';

export interface BundledModelState {
  status: BundledModelStatus;
  version?: string;
  sha256?: string;
}

// Configuration interface
export interface Config {
  provider: ProviderKey;
  apiKey?: string;
  model?: string;
  baseUrl?: string; // For OpenAI compatible providers like LM Studio
  bundledModel?: BundledModelState;
  version: string;
}

// Default configuration
const DEFAULT_CONFIG: Partial<Config> = {
  version: '1.0.0',
};

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

  // Local providers don't require an API key
  if (
    config.provider === 'ollama' ||
    config.provider === 'lmstudio' ||
    config.provider === 'openaiCompatible' ||
    config.provider === 'bundled'
  ) {
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
    label: `${provider.name} - ${provider.description}`,
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

  return provider;
}

/**
 * Prompt user to enter API key
 */
export async function promptApiKey(provider: ProviderKey): Promise<string | undefined> {
  const providerInfo = SUPPORTED_PROVIDERS[provider];

  if (provider === 'bundled') {
    await print(chalk.green('Bundled local model selected - no API key required.'));
    return undefined;
  }

  // Ollama and LM Studio don't need an API key
  if (provider === 'ollama') {
    await print(chalk.green('Ollama selected - no API key required.'));
    return undefined;
  }

  if (provider === 'lmstudio') {
    await print(chalk.green('LM Studio selected - no API key required.'));
    return undefined;
  }

  if (provider === 'openaiCompatible') {
    await print(chalk.yellow('\nOpenAI Compatible provider selected.'));
    await print(chalk.gray('API key is optional - only needed for hosted services that require authentication.'));
    await print(chalk.gray('Leave empty if connecting to a local server without authentication.'));

    // Check environment variable first
    const envApiKey = getApiKeyFromEnv(provider);
    if (envApiKey) {
      await print(chalk.green(`Using API key from environment variable: ${providerInfo.envVar}`));
      return envApiKey;
    }

    const needsApiKey = await confirm({
      message: 'Does your OpenAI-compatible endpoint require an API key?',
    });

    if (isCancel(needsApiKey)) {
      cancel('API key configuration cancelled');
      process.exit(0);
    }

    if (!needsApiKey) {
      await print(chalk.green('No API key will be used - connecting without authentication.'));
      return undefined;
    }

    const apiKey = await password({
      message: 'Enter your OpenAI-compatible API key:',
      mask: '*',
    });

    if (isCancel(apiKey)) {
      cancel('API key entry cancelled');
      process.exit(0);
    }

    return apiKey;
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

  if (isCancel(apiKey)) {
    cancel('API key entry cancelled');
    process.exit(0);
  }

  return apiKey;
}

/**
 * Prompt user to enter base URL for OpenAI compatible providers
 */
export async function promptBaseUrl(provider: ProviderKey): Promise<string | undefined> {
  const providerInfo = SUPPORTED_PROVIDERS[provider];

  // Only prompt for base URL if the provider supports it
  if (!('supportsCustomBaseUrl' in providerInfo) || !providerInfo.supportsCustomBaseUrl) {
    return undefined;
  }

  const defaultBaseUrl = 'defaultBaseUrl' in providerInfo ? providerInfo.defaultBaseUrl : undefined;

  await print(chalk.yellow(`\nYou can configure a custom base URL for ${providerInfo.name}.`));

  const baseUrl = await text({
    message: `Enter base URL for ${providerInfo.name}:`,
    placeholder: defaultBaseUrl || 'http://localhost:1234/v1',
    initialValue: defaultBaseUrl,
  });

  if (isCancel(baseUrl)) {
    cancel('Base URL configuration cancelled');
    process.exit(0);
  }

  return baseUrl || defaultBaseUrl;
}

export async function promptLocalModel(provider: 'ollama' | 'lmstudio', current?: string): Promise<string> {
  const options = LOCAL_MODEL_CATALOG.map(entry => ({
    label: `${entry.label} (${entry.sizeHint}, ${entry.hardware})`,
    value: catalogModelId(entry, provider),
    hint: entry.promptStyle === 'commandOnly' ? 'command-only; may skip explanations' : entry.pullHint,
  }));
  options.push({ label: 'Custom…', value: '__custom__', hint: 'Enter any model id' });

  const selected = await select({
    message: `Select a local model for ${SUPPORTED_PROVIDERS[provider].name}:`,
    options,
    initialValue: current,
  });

  if (isCancel(selected)) {
    cancel('Model selection cancelled');
    process.exit(0);
  }

  if (selected !== '__custom__') {
    return selected;
  }

  const custom = await text({
    message: `Enter model name for ${SUPPORTED_PROVIDERS[provider].name}:`,
    placeholder: current || SUPPORTED_PROVIDERS[provider].defaultModel,
    initialValue: current || SUPPORTED_PROVIDERS[provider].defaultModel,
  });

  if (isCancel(custom) || !custom) {
    cancel('Model selection cancelled');
    process.exit(0);
  }

  return custom;
}

export function installedBundledState(): BundledModelState {
  return {
    status: 'installed',
    version: BUNDLED_MODEL.version,
    sha256: BUNDLED_MODEL.sha256,
  };
}

async function offerBundledModel(): Promise<BundledModelState> {
  if (shouldSkipBundledModelPrompt()) {
    await print(chalk.gray('Skipping bundled model download (LSH_SKIP_BUNDLED_MODEL or --skip-bundled-model).'));
    return { status: 'skipped' };
  }

  await print(
    chalk.blue(
      `\nLazyShell can download a bundled ${BUNDLED_MODEL.displayName} GGUF (~${Math.round(BUNDLED_MODEL.sizeBytes / 1_000_000)} MB, ${BUNDLED_MODEL.license}) for offline use.`
    )
  );
  await print(chalk.gray(`Saved to ~/.lazyshell/models/${BUNDLED_MODEL.filename}`));

  const shouldDownload = await confirm({
    message: 'Download the bundled local model now?',
    initialValue: false,
  });

  if (isCancel(shouldDownload)) {
    cancel('Configuration cancelled');
    process.exit(0);
  }

  if (!shouldDownload) {
    return { status: 'declined' };
  }

  try {
    await print(chalk.cyan('Downloading bundled model (checksum verified)...'));
    await installBundledModel((downloaded, total) => {
      if (total > 0 && downloaded === total) {
        process.stdout.write(`\rDownloaded ${(downloaded / 1_000_000).toFixed(0)} MB`);
      }
    });
    process.stdout.write('\n');
    await print(chalk.green('Bundled model installed.'));
    return installedBundledState();
  } catch (error) {
    console.error(chalk.red(`Bundled model download failed: ${error}`));
    return { status: 'declined' };
  }
}

async function resolveInitialProvider(bundledModel: BundledModelState): Promise<ProviderKey | undefined> {
  if (bundledModel.status === 'installed' && !hasCloudApiKey() && !(await isOllamaReachable())) {
    return 'bundled';
  }
  return undefined;
}

/**
 * Initialize configuration through user prompts
 */
export async function initializeConfig(existing?: Config | null): Promise<Config | null> {
  console.log(chalk.blue('\n🔧 Setting up LazyShell configuration...\n'));

  try {
    let bundledModel = existing?.bundledModel;
    if (!bundledModel) {
      bundledModel = await offerBundledModel();
    }

    const autoProvider = await resolveInitialProvider(bundledModel);
    const provider = autoProvider ?? (await promptProvider());

    if (provider === 'bundled' && bundledModel.status !== 'installed') {
      if (!(await isBundledModelInstalled())) {
        bundledModel = await offerBundledModel();
      } else {
        bundledModel = installedBundledState();
      }
      if (bundledModel.status !== 'installed') {
        console.error(
          chalk.red(
            'Bundled model is required for that provider. Choose another provider or run `lazyshell model install`.'
          )
        );
        return null;
      }
    }

    const apiKey = await promptApiKey(provider);
    const baseUrl = await promptBaseUrl(provider);

    let model: string = SUPPORTED_PROVIDERS[provider].defaultModel;
    if (provider === 'ollama' || provider === 'lmstudio') {
      model = await promptLocalModel(provider, model);
    }

    const config: Config = {
      ...DEFAULT_CONFIG,
      ...existing,
      provider,
      apiKey,
      model,
      baseUrl,
      bundledModel,
      version,
    };

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
    }
    console.log(chalk.yellow('Configuration exists but is incomplete or invalid.'));
    return initializeConfig(config);
  }

  console.log(chalk.yellow('No configuration found.'));
  return initializeConfig();
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
  if (config.apiKey) {
    return config.apiKey;
  }
  return getApiKeyFromEnv(config.provider);
}
