import { generateText, type LanguageModel } from 'ai';
import { groq } from '@ai-sdk/groq';
import { google } from '@ai-sdk/google';
import { Command } from 'commander';
import { confirm } from '@inquirer/prompts';
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


const program = new Command();
program
  .version(require("../package.json").version)
  .description(require("../package.json").description)
  .argument("<prompt_parts...>", "prompt")
  .option("-y, --yes", "auto-confirm")
  .action(async (prompt_parts: string[], options) => {
    const prompt = prompt_parts.join(" ")
    try {
      const result = await genCommand(prompt);
      const command = result.text;
      let confirmed = false;
      if (!options.y) {
        confirmed = await confirm({
          message:
            `Run this command: ${chalk.green(command)}?`,
          default: false,
        });
        if (!confirmed) {
          console.log("Command not run.");
          return;
        }
      }
      runCommand(command);
    }
    catch (error) {
      console.error(chalk.red(error));
    }

  })

program.parse(process.argv);

