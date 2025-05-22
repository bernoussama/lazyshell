import { Command } from 'commander';
import { select, input } from '@inquirer/prompts';
import chalk from 'chalk';
import { runCommand } from './utils';
import ora from 'ora';
import { generateCommand, getDefaultModel } from './lib/ai';

async function genCommand(prompt: string) {
  const modelConfig = getDefaultModel();

  // console log the model being used
  console.log(chalk.blue(`Using model: ${modelConfig.provider}/${modelConfig.modelId}`));

  // Show spinner while generating command
  const spinner = ora('Generating command...').start();
  try {
    const result = await generateCommand(prompt);
    spinner.succeed();
    return { text: result };
  } catch (error) {
    spinner.fail('Failed to generate command');
    throw error;
  }
}

async function editPrompt(command: string): Promise<string> {
  // For now, just return the command as is
  // In a real implementation, this would open an editor
  const editedCommand = await input({
    message: 'How would you like to edit the command?',
    default: command,
  });
  return editedCommand;
}

async function refineCommand(currentPrompt: string, command: string): Promise<string> {
  const refineText = await input({
    message: 'How would you like to refine the command?',
    default: '',
  });

  // Combine the original prompt with the refinement
  return `former prompt:${currentPrompt} its command is ${command} refining prompt: ${refineText}`;
}

const program = new Command();
program
  .version(require("../package.json").version)
  .description(require("../package.json").description)
  .argument("<prompt_parts...>", "prompt")
  .action(async (prompt_parts: string[]) => {
    let currentPrompt = prompt_parts.join(" ");
    let shouldContinue = true;

    while (shouldContinue) {
      try {
        const result = await genCommand(currentPrompt);
        const command = result.text.trim();

        const action = await select({
          message: `Command: ${chalk.green(command)}`,
          choices: [
            { name: '✅ Execute command (Ctrl+I)', value: 'execute' },
            // { name: '✏️  Edit command', value: 'edit' },
            { name: '🔧 Refine prompt (Ctrl+R)', value: 'refine' },
            { name: '❌ Cancel (Ctrl+C)', value: 'cancel' },
          ],
        });

        switch (action) {
          case 'execute':
            runCommand(command);
            shouldContinue = false;
            break;
          case 'edit':
            currentPrompt = await editPrompt(command);
            break;
          case 'refine':
            currentPrompt = await refineCommand(currentPrompt, command);
            break;
          case 'cancel':
            console.log(chalk.yellow('Command cancelled.'));
            return;
        }
      } catch (error) {
        console.error(chalk.red(error));
        shouldContinue = false;
      }
    }
  })

program.parse(process.argv);
