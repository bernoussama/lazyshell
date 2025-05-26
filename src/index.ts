import { intro, outro, select, text, spinner } from '@clack/prompts';
import chalk from 'chalk';
import { runCommand } from './utils';
import { generateCommand, generateCommandStruct, getDefaultModel, getModelFromConfig } from './lib/ai';
import { Clipboard } from '@napi-rs/clipboard';
import { getOrInitializeConfig } from './lib/config';

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
    console.error(chalk.red(`Configuration error: ${error}`));
    console.log(chalk.yellow('Falling back to environment variables...'));
    modelConfig = getDefaultModel();
  }

  // console log the model being used
  console.log(chalk.blue(`Using model: ${modelConfig.provider}/${modelConfig.modelId}`));

  // Show spinner while generating command
  const s = spinner();
  s.start('Generating command...');
  try {
    const result = await generateCommand(prompt);
    s.stop();
    return { text: result };
  } catch (error) {
    s.stop('Failed to generate command');
    throw error;
  }
}

async function editPrompt(command: string): Promise<string> {
  // For now, just return the command as is
  // In a real implementation, this would open an editor
  const editedCommand = await text({
    message: 'How would you like to edit the command?',
    defaultValue: command,
  });
  return editedCommand as string;
}

async function refineCommand(currentPrompt: string, command: string): Promise<string> {
  const refineText = await text({
    message: 'How would you like to refine the command?',
    defaultValue: '',
  });

  // Combine the original prompt with the refinement
  return `former prompt:${currentPrompt} its command is ${command} refining prompt: ${String(refineText)}`;
}

// Parse command line arguments manually
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error(chalk.red('Please provide a prompt'));
  process.exit(1);
}

async function main() {
  const prompt_parts = args;
  let currentPrompt = prompt_parts.join(' ');
  let shouldContinue = true;

  intro(chalk.blue('🐚 LazyShell'));

  const clipboard = new Clipboard();
  while (shouldContinue) {
    try {
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

      console.log(chalk.blue(`Using model: ${modelConfig.provider}/${modelConfig.modelId}`));

      const s = spinner();
      s.start('Generating command...');
      
      const result = await generateCommandStruct(currentPrompt, modelConfig);
      const command = result.command.trim();
      
      s.stop('Command generated successfully');

      clipboard.setText(command);

      const action = await select({
        message: `${chalk.yellow('Explanation:')} ${result.explanation}\n${chalk.green('Command:')} ${command}\n\nWhat would you like to do?`,
        options: [
          { label: '✅ Execute command', value: 'execute' as const },
          // { label: '✏️  Edit command', value: 'edit' as const },
          { label: '🔧 Refine prompt', value: 'refine' as const },
          { label: '❌ Cancel', value: 'cancel' as const },
        ],
      });

      switch (action) {
        case 'execute':
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
  
  outro(chalk.green('Done! 🎉'));
}

main().catch(console.error);
