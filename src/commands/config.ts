import { select, text as input, confirm, isCancel, outro } from '@clack/prompts';
import chalk from 'chalk';
import { getOrInitializeConfig, loadConfig, saveConfig, promptProvider, promptApiKey, SUPPORTED_PROVIDERS, Config, configExists } from '../lib/config';

export async function showConfigUI() {
  console.log(chalk.blue('\n🔧 LazyShell Configuration'));
  console.log(chalk.gray('════════════════════════════\n'));

  const configFile = await configExists();
  if (!configFile) {
    console.log(chalk.yellow('📄 No configuration file found.'));
    const shouldCreate = await confirm({
      message: 'Would you like to create a new configuration?',
    });
    
    if (isCancel(shouldCreate) || !shouldCreate) {
      outro(chalk.gray('Configuration UI closed.'));
      return;
    }
    
    const config = await getOrInitializeConfig();
    if (config) {
      console.log(chalk.green('\n✅ Configuration created successfully!'));
      await showCurrentConfig(config);
    }
    return;
  }

  const config = await loadConfig();
  if (!config) {
    console.log(chalk.red('❌ Failed to load configuration file.'));
    return;
  }

  await showCurrentConfig(config);
  
  const action = await select({
    message: 'What would you like to do?',
    options: [
      { label: '📝 Edit Provider', value: 'edit-provider' },
      { label: '🔑 Edit API Key', value: 'edit-apikey' },
      { label: '🤖 Edit Model', value: 'edit-model' },
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
    case 'reset':
      await resetConfiguration();
      break;
  }
}

async function showCurrentConfig(config: Config) {
  const provider = SUPPORTED_PROVIDERS[config.provider];
  const hasApiKey = config.apiKey && config.apiKey.length > 0;
  const maskedApiKey = hasApiKey ? `${config.apiKey!.slice(0, 8)}...` : 'Not set';
  
  console.log(chalk.blue('📋 Current Configuration:'));
  console.log(chalk.gray('──────────────────────────'));
  console.log(`${chalk.cyan('Provider:')} ${provider.name}`);
  console.log(`${chalk.cyan('Description:')} ${provider.description}`);
  console.log(`${chalk.cyan('Model:')} ${config.model || provider.defaultModel}`);
  console.log(`${chalk.cyan('API Key:')} ${hasApiKey ? chalk.green(maskedApiKey) : chalk.yellow(maskedApiKey)}`);
  console.log(`${chalk.cyan('Config File:')} ~/.lazyshell/config.json`);
  console.log('');
}

async function editProvider(config: Config) {
  console.log(chalk.blue('\n🔄 Change Provider'));
  console.log(chalk.gray('──────────────────'));
  
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
  
  const saved = await saveConfig(config);
  if (saved) {
    console.log(chalk.green('\n✅ Provider updated successfully!'));
    await showCurrentConfig(config);
  } else {
    console.log(chalk.red('\n❌ Failed to save configuration.'));
  }
}

async function editApiKey(config: Config) {
  console.log(chalk.blue('\n🔑 Update API Key'));
  console.log(chalk.gray('─────────────────'));
  
  if (!SUPPORTED_PROVIDERS[config.provider].envVar) {
    console.log(chalk.yellow(`${SUPPORTED_PROVIDERS[config.provider].name} doesn't require an API key.`));
    return;
  }
  
  const newApiKey = await promptApiKey(config.provider);
  config.apiKey = newApiKey;
  
  const saved = await saveConfig(config);
  if (saved) {
    console.log(chalk.green('\n✅ API key updated successfully!'));
    await showCurrentConfig(config);
  } else {
    console.log(chalk.red('\n❌ Failed to save configuration.'));
  }
}

async function editModel(config: Config) {
  console.log(chalk.blue('\n🤖 Change Model'));
  console.log(chalk.gray('───────────────'));
  
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
    console.log(chalk.green('\n✅ Model updated successfully!'));
    await showCurrentConfig(config);
  } else {
    console.log(chalk.red('\n❌ Failed to save configuration.'));
  }
}

async function resetConfiguration() {
  console.log(chalk.blue('\n🔄 Reset Configuration'));
  console.log(chalk.gray('────────────────────────'));
  
  const confirmed = await confirm({
    message: chalk.yellow('Are you sure you want to reset your configuration? This will delete your current settings.'),
  });
  
  if (isCancel(confirmed) || !confirmed) {
    console.log(chalk.gray('Reset cancelled.'));
    return;
  }
  
  console.log(chalk.blue('\n🔧 Creating new configuration...'));
  const newConfig = await getOrInitializeConfig();
  
  if (newConfig) {
    console.log(chalk.green('\n✅ Configuration reset successfully!'));
    await showCurrentConfig(newConfig);
  } else {
    console.log(chalk.red('\n❌ Failed to reset configuration.'));
  }
}