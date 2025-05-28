import { Command } from 'commander';
import { select, text as input, spinner, stream, outro, isCancel, cancel } from '@clack/prompts';
import chalk from 'chalk';
import { runCommand } from './utils';
import { generateCommandStruct, getDefaultModel, getModelFromConfig } from './lib/ai';
import { Clipboard } from '@napi-rs/clipboard';
import { getOrInitializeConfig } from './lib/config';
import { showConfigUI } from './commands/config';

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
    let currentPrompt = prompt_parts.join(' ');
    let shouldContinue = true;
    const silent = options.silent || false;

    const clipboard = new Clipboard();
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

        console.log(chalk.blue(`Using model: ${modelConfig.provider}/${modelConfig.modelId}`));

        const spin = spinner();
        spin.start('Generating command...');
        const result = await generateCommandStruct(currentPrompt, modelConfig, !silent);

        spin.stop('Your command: ');
        const command = result.command.trim();
        await stream.message(
          (function* () {
            yield `${command}`;
          })()
        );
        if ('explanation' in result && result.explanation) {
          await stream.info(
            (function* () {
              yield `Explanation:\
${result.explanation.trim()}
`;
            })()
          );
        }

        clipboard.setText(command);

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
