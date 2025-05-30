import { select, text as input, confirm, isCancel, outro, intro } from '@clack/prompts';
import chalk from 'chalk';
import {
  getOrInitializeConfig,
  loadConfig,
  saveConfig,
  promptProvider,
  promptApiKey,
  promptBaseUrl,
  SUPPORTED_PROVIDERS,
  Config,
  configExists,
} from '../lib/config';
import { info, print } from '../utils';

export async function showConfigUI() {
  intro(chalk.blue('🔧 LazyShell Configuration'));

  const configFile = await configExists();
  if (!configFile) {
    await info(chalk.yellow('📄 No configuration file found.'));
    const shouldCreate = await confirm({
      message: 'Would you like to create a new configuration?',
    });

    if (isCancel(shouldCreate) || !shouldCreate) {
      outro(chalk.gray('Configuration UI closed.'));
      return;
    }

    const config = await getOrInitializeConfig();
    if (config) {
      await info(chalk.green('✅ Configuration created successfully!'));
      await showCurrentConfig(config);
    }
    return;
  }

  const config = await loadConfig();
  if (!config) {
    await info(chalk.red('❌ Failed to load configuration file.'));
    return;
  }

  await showCurrentConfig(config);

  const action = await select({
    message: 'What would you like to do?',
    options: [
      { label: '📝 Edit Provider', value: 'edit-provider' },
      { label: '🔑 Edit API Key', value: 'edit-apikey' },
      { label: '🤖 Edit Model', value: 'edit-model' },
      { label: '🌐 Edit Base URL', value: 'edit-baseurl' },
      { label: '🔄 Reset Configuration', value: 'reset' },
      { label: '❌ Exit', value: 'exit' },
    ],
  });

  if (isCancel(action) || action === 'exit') {
    outro(chalk.gray('Configuration UI closed.'));
    return;
  }

  switch (action) {
    case 'edit-provider':
      await editProvider(config);
      break;
    case 'edit-apikey':
      await editApiKey(config);
      break;
    case 'edit-model':
      await editModel(config);
      break;
    case 'edit-baseurl':
      await editBaseUrl(config);
      break;
    case 'reset':
      await resetConfiguration();
      break;
  }
}

async function showCurrentConfig(config: Config) {
  const provider = SUPPORTED_PROVIDERS[config.provider];
  const hasApiKey = config.apiKey && config.apiKey.length > 0;
  const maskedApiKey = hasApiKey ? `${config.apiKey!.slice(0, 8)}...` : 'Not set';

  await info(chalk.blue('📋 Current Configuration:'));
  await print(`${chalk.cyan('Provider:')} ${provider.name}`);
  await print(`${chalk.cyan('Description:')} ${provider.description}`);
  await print(`${chalk.cyan('Model:')} ${config.model || provider.defaultModel}`);
  await print(`${chalk.cyan('API Key:')} ${hasApiKey ? chalk.green(maskedApiKey) : chalk.yellow(maskedApiKey)}`);

  // Show base URL for providers that support it
  if ('supportsCustomBaseUrl' in provider && provider.supportsCustomBaseUrl) {
    const defaultBaseUrl = 'defaultBaseUrl' in provider ? provider.defaultBaseUrl : 'http://localhost:1234/v1';
    const currentBaseUrl = config.baseUrl || defaultBaseUrl;
    await print(`${chalk.cyan('Base URL:')} ${currentBaseUrl}`);
  }

  await print(`${chalk.cyan('Config File:')} ~/.lazyshell/config.json`);
}

async function editProvider(config: Config) {
  // console.log(chalk.blue('🔄 Change Provider'));

  const newProvider = await promptProvider();
  config.provider = newProvider;
  config.model = SUPPORTED_PROVIDERS[newProvider].defaultModel;

  // If the new provider requires an API key, prompt for it
  if (SUPPORTED_PROVIDERS[newProvider].envVar) {
    const newApiKey = await promptApiKey(newProvider);
    config.apiKey = newApiKey;
  } else {
    config.apiKey = undefined;
  }

  // If the new provider supports custom base URL, prompt for it
  const newBaseUrl = await promptBaseUrl(newProvider);
  config.baseUrl = newBaseUrl;

  const saved = await saveConfig(config);
  if (saved) {
    await showCurrentConfig(config);
    outro(chalk.green('✅ Provider updated successfully!'));
  } else {
    outro(chalk.red('❌ Failed to save configuration.'));
  }
}

async function editApiKey(config: Config) {
  // console.log(chalk.blue('🔑 Update API Key'));

  const providerInfo = SUPPORTED_PROVIDERS[config.provider];

  // Handle providers that don't support API keys at all
  if (!providerInfo.envVar && config.provider !== 'openaiCompatible') {
    await print(chalk.yellow(`${providerInfo.name} doesn't require an API key.`));
    return;
  }

  // Special handling for openaiCompatible which has optional API key support
  if (config.provider === 'openaiCompatible') {
    await print(chalk.blue(`Configuring API key for ${providerInfo.name}:`));
    await print(chalk.gray('API key is optional - only needed for hosted services that require authentication.'));
  }

  const newApiKey = await promptApiKey(config.provider);
  config.apiKey = newApiKey;

  const saved = await saveConfig(config);
  if (saved) {
    await showCurrentConfig(config);
    outro(chalk.green('✅ API key updated successfully!'));
  } else {
    outro(chalk.red('❌ Failed to save configuration.'));
  }
}

async function editModel(config: Config) {
  // console.log(chalk.blue('🤖 Change Model'));

  const currentModel = config.model || SUPPORTED_PROVIDERS[config.provider].defaultModel;

  const newModel = await input({
    message: `Enter model name for ${SUPPORTED_PROVIDERS[config.provider].name}:`,
    placeholder: currentModel,
    initialValue: currentModel,
  });

  if (isCancel(newModel)) {
    return;
  }

  config.model = newModel;

  const saved = await saveConfig(config);
  if (saved) {
    await showCurrentConfig(config);
    outro(chalk.green('✅ Model updated successfully!'));
  } else {
    outro(chalk.red('❌ Failed to save configuration.'));
  }
}

async function editBaseUrl(config: Config) {
  // console.log(chalk.blue('🌐 Change Base URL'));

  const providerInfo = SUPPORTED_PROVIDERS[config.provider];

  // Check if the provider supports custom base URL
  if (!('supportsCustomBaseUrl' in providerInfo) || !providerInfo.supportsCustomBaseUrl) {
    await print(chalk.yellow(`${providerInfo.name} doesn't support custom base URL configuration.`));
    return;
  }

  const defaultBaseUrl = 'defaultBaseUrl' in providerInfo ? providerInfo.defaultBaseUrl : 'http://localhost:1234/v1';
  const currentBaseUrl = config.baseUrl || defaultBaseUrl;

  const newBaseUrl = await input({
    message: `Enter new base URL for ${providerInfo.name}:`,
    placeholder: currentBaseUrl,
    initialValue: currentBaseUrl,
  });

  if (isCancel(newBaseUrl)) {
    return;
  }

  config.baseUrl = newBaseUrl;

  const saved = await saveConfig(config);
  if (saved) {
    await showCurrentConfig(config);
    outro(chalk.green('✅ Base URL updated successfully!'));
  } else {
    outro(chalk.red('❌ Failed to save configuration.'));
  }
}

async function resetConfiguration() {
  // console.log(chalk.blue('🔄 Reset Configuration'));

  const confirmed = await confirm({
    message: chalk.yellow('Are you sure you want to reset your configuration? This will delete your current settings.'),
  });

  if (isCancel(confirmed) || !confirmed) {
    await info(chalk.gray('Reset cancelled.'));
    return;
  }

  await info(chalk.blue('🔧 Creating new configuration...'));
  const newConfig = await getOrInitializeConfig();

  if (newConfig) {
    await showCurrentConfig(newConfig);
    outro(chalk.green('✅ Configuration reset successfully!'));
  } else {
    outro(chalk.red('❌ Failed to reset configuration.'));
  }
}
