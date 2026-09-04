import { Command } from 'commander';
import { select, text as input, spinner, outro, isCancel, cancel, intro } from '@clack/prompts';
import chalk from 'chalk';
import { info, print, runCommand, printWrapped } from './utils';
import {
  generateCommandStruct,
  getDefaultModelAsync,
  getModelFromConfig,
  prepareLocalRuntime,
  type ModelConfig,
} from './lib/ai';
import { getOrInitializeConfig } from './lib/config';
import { showConfigUI } from './commands/config';
import { installBundledModelCommand, removeBundledModelCommand } from './commands/model';
import { SKIP_BUNDLED_MODEL_FLAG } from './lib/paths';

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    const isAndroid = process.env.ANDROID_ROOT || process.env.ANDROID_DATA;
    if (isAndroid) {
      return false;
    }

    const { Clipboard } = await import('@napi-rs/clipboard');
    const clipboard = new Clipboard();
    clipboard.setText(text);
    return true;
  } catch {
    return false;
  }
}

async function resolveModelConfig(): Promise<ModelConfig> {
  const config = await getOrInitializeConfig();
  if (!config) {
    console.error(chalk.red('Failed to initialize configuration. Exiting.'));
    process.exit(1);
  }

  try {
    const ready = await prepareLocalRuntime(config);
    return getModelFromConfig(ready);
  } catch (error) {
    console.error(chalk.red(`Configuration error: ${error}`));
    console.log(chalk.yellow('Falling back to environment variables or a local runtime...'));
    return getDefaultModelAsync();
  }
}

async function refineCommand(currentPrompt: string, command: string): Promise<string> {
  const refineText = await input({
    message: 'How would you like to refine the command?',
    placeholder: '',
  });

  if (isCancel(refineText)) {
    cancel('Refinement cancelled.');
    process.exit(0);
  }

  return `former prompt:${currentPrompt} its command is ${command} refining prompt: ${refineText}`;
}

const program = new Command();
program
  .version(require('../package.json').version)
  .description(require('../package.json').description)
  .argument('<prompt_parts...>', 'prompt')
  .option('-s, --silent', 'run in silent mode (no explanation)')
  .option(SKIP_BUNDLED_MODEL_FLAG, 'skip the bundled-model download prompt')
  .action(async (prompt_parts: string[], options) => {
    intro(chalk.bgBlue(chalk.black('LazyShell')));
    let currentPrompt = prompt_parts.join(' ');
    let shouldContinue = true;
    const silent = options.silent || false;

    while (shouldContinue) {
      try {
        const modelConfig = await resolveModelConfig();

        const spin = spinner();
        spin.start('Loading...');
        const result = await generateCommandStruct(currentPrompt, modelConfig, !silent);

        spin.stop('Your command: ');
        const command = result.command.trim();
        await print(command);
        if ('explanation' in result && result.explanation) {
          await info('Explanation:');
          await printWrapped(result.explanation.trim(), 80);
        }

        const clipboardSuccess = await copyToClipboard(command);
        if (clipboardSuccess) {
          await print(chalk.green('📋 Command copied to clipboard!'));
        }

        const action = await select({
          message: 'Run command?',
          options: [
            { label: '✅ Yes', value: 'execute' },
            { label: '🔧 Refine', value: 'refine' },
            { label: '❌ Cancel', value: 'cancel' },
          ],
        });
        if (isCancel(action)) {
          cancel('Operation cancelled.');
          process.exit(0);
        }

        switch (action) {
          case 'execute':
            outro(`running command: ${chalk.green(command)}`);
            runCommand(command);
            shouldContinue = false;
            break;
          case 'refine':
            currentPrompt = await refineCommand(currentPrompt, command);
            break;
          case 'cancel':
            outro(chalk.yellow('Command cancelled.'));
            return;
          default: {
            const _exhaustive: never = action;
            throw new Error(`Unhandled action: ${_exhaustive}`);
          }
        }
      } catch (error) {
        console.error(chalk.red(error));
        shouldContinue = false;
      }
    }
  });

program
  .command('config')
  .description('Open configuration UI')
  .action(async () => {
    await showConfigUI();
  });

const modelCommand = program.command('model').description('Manage the bundled local model');
modelCommand
  .command('install')
  .description('Download the bundled ~469 MB local model')
  .action(installBundledModelCommand);
modelCommand.command('remove').description('Delete the bundled local model').action(removeBundledModelCommand);

program.parse(process.argv);
