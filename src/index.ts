import { generateText, type LanguageModel } from 'ai';
import { groq } from '@ai-sdk/groq';
import { google } from '@ai-sdk/google';
import { Command } from 'commander';
import { select, input } from '@inquirer/prompts';
import chalk from 'chalk';
import { runCommand } from './utils';

async function genCommand(prompt: string) {
  let model: LanguageModel;
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    model = google('gemini-2.0-flash-lite');

  } else if (process.env.GROQ_API_KEY) {
    model = groq('llama-3.1-8b-instant');
  } else {
    return Promise.reject(new Error("No API key found. Please set either GROQ_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY."));
  }


  const result = await generateText({
    model,
    temperature: 0,
    system: "You are an expert system administrator." +
      "Your task is to generate ONLY the command to run following user request." +
      "Do not use markdown or any other formatting. Do not add any explanation or additional information.",
    prompt,
  });
  return result;
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
            { name: '✅ Execute command', value: 'execute' },
            // { name: '✏️  Edit command', value: 'edit' },
            { name: '🔧 Refine prompt', value: 'refine' },
            { name: '❌ Cancel', value: 'cancel' },
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

