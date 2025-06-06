import { Command } from 'commander';
import { select, text as input, spinner, outro, isCancel, cancel, intro } from '@clack/prompts';
import chalk from 'chalk';
import { info, print, runCommand, printWrapped } from './utils';
import { generateCommand, generateCommandStruct, getDefaultModel, getModelFromConfig } from './lib/ai';
import { getOrInitializeConfig } from './lib/config';

import { showConfigUI } from './commands/config';

// Conditional clipboard functionality
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Only import and use clipboard on supported platforms
    const os = require('os');
    const platform = os.platform();

    // Skip clipboard on Android (which shows up as linux) and potentially problematic ARM systems
    // Check for Android-specific indicators
    const isAndroid = process.env.ANDROID_ROOT || process.env.ANDROID_DATA || platform === 'android';

    // Skip if it's Android or if we're on ARM and the environment looks mobile
    if (isAndroid) {
      return false;
    }

    // Try to import the clipboard module
    const { Clipboard } = await import('@napi-rs/clipboard');
    const clipboard = new Clipboard();
    clipboard.setText(text);
    return true;
  } catch {
    // Silently fail if clipboard is not available
    return false;
  }
}

async function genCommand(prompt: string) {
  // Get configuration first
  const config = await getOrInitializeConfig();
  if (!config) {
    console.error(chalk.red('Failed to initialize configuration. Exiting.'));
    process.exit(1);
  }

  let modelConfig;
  try {
    modelConfig = getModelFromConfig(config);
  } catch (error) {
    await print(chalk.red(`Configuration error: ${error}`));
    await print(chalk.yellow('Falling back to environment variables...'));
    modelConfig = getDefaultModel();
  }

  // console log the model being used
  // console.log(chalk.blue(`Using model: ${modelConfig.provider}/${modelConfig.modelId}`));

  // Show spinner while generating command
  const spin = spinner();
  spin.start('Loading...');
  try {
    const result = await generateCommand(prompt);
    spin.stop('Command generated successfully!');
    return { text: result };
  } catch (error) {
    spin.stop(chalk.red('Failed to generate command'));
    throw error;
  }
}

async function editPrompt(command: string): Promise<string> {
  // For now, just return the command as is
  // In a real implementation, this would open an editor
  const editedCommand = await input({
    message: 'How would you like to edit the command?',
    placeholder: command,
  });
  if (isCancel(editedCommand)) {
    cancel('Editing cancelled.');
    process.exit(0);
  }
  return editedCommand;
}

async function refineCommand(currentPrompt: string, command: string): Promise<string> {
  const refineText = await input({
    message: 'How would you like to refine the command?',
    placeholder: '',
  });

  // Combine the original prompt with the refinement
  return `former prompt:${currentPrompt} its command is ${command} refining prompt: ${refineText as string}`;
}

const program = new Command();
program
  .version(require('../package.json').version)
  .description(require('../package.json').description)
  .argument('<prompt_parts...>', 'prompt')
  .option('-s, --silent', 'run in silent mode (no explanation)')
  .action(async (prompt_parts: string[], options) => {
    intro(chalk.bgBlue(chalk.black('LazyShell')));
    let currentPrompt = prompt_parts.join(' ');
    let shouldContinue = true;
    const silent = options.silent || false;

    while (shouldContinue) {
      try {
        // const result = await genCommand(currentPrompt);
        // const command = result.text.trim();

        // Get configuration and use it for command generation
        const config = await getOrInitializeConfig();
        if (!config) {
          console.error(chalk.red('Failed to initialize configuration. Exiting.'));
          process.exit(1);
        }

        let modelConfig;
        try {
          modelConfig = getModelFromConfig(config);
        } catch (error) {
          console.error(chalk.red(`Configuration error: ${error}`));
          console.log(chalk.yellow('Falling back to environment variables...'));
          modelConfig = getDefaultModel();
        }

        // console.log(chalk.blue(`Using model: ${modelConfig.provider}/${modelConfig.modelId}`));

        const spin = spinner();
        spin.start('Loading...');
        const result = await generateCommandStruct(currentPrompt, modelConfig, !silent);

        spin.stop('Your command: ');
        const command = result.command.trim();
        await print(`${command}`);
        if ('explanation' in result && result.explanation) {
          await info('Explanation:');
          const lineWidth = 80;
          await printWrapped(`${result.explanation.trim()}`, lineWidth);
        }

        const clipboardSuccess = await copyToClipboard(command);
        if (clipboardSuccess) {
          await print(chalk.green('📋 Command copied to clipboard!'));
        }

        const action = await select({
          message: 'Run command?',
          options: [
            { label: '✅ Yes', value: 'execute' },
            // { name: '✏️  Edit command', value: 'edit' },
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
          // case 'edit':
          //   currentPrompt = await editPrompt(command);
          //   break;
          case 'refine':
            currentPrompt = await refineCommand(currentPrompt, command);
            break;
          case 'cancel':
            outro(chalk.yellow('Command cancelled.'));
            return;
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

program.parse(process.argv);
