import { generateText, type LanguageModel } from 'ai';
import { groq } from '@ai-sdk/groq';
import { google } from '@ai-sdk/google';
import { ollama } from 'ollama-ai-provider';
import { openrouter } from '@openrouter/ai-sdk-provider';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { performance } from 'perf_hooks';

// Define the models to benchmark
const models: Record<string, LanguageModel> = {

  'openrouter-llama3.3': openrouter('meta-llama/llama-3.3-8b-instruct:free'),
  'groq-mixtral-8x7b': groq('mixtral-8x7b-32768'),
  'groq-llama3-8b': groq('llama3-8b-8192'),
  'gemini-2.0-flash-lite': google('gemini-2.0-flash-lite'),
  // 'openai-gpt-4': openai('gpt-4'),
  // 'openai-gpt-3.5-turbo': openai('gpt-3.5-turbo'),
  // 'anthropic-claude-3-sonnet': anthropic('claude-3-sonnet-20240229'),
  // 'anthropic-claude-3-haiku': anthropic('claude-3-haiku-20240307'),
  // Add any local Ollama models you want to test
  'ollama3.2': ollama('llama3.2'),
};

// Define benchmark prompts
const prompts = [
  "Generate a bash command to find all files over 100MB in the current directory",
  "Write a command to list all running docker containers with their memory usage",
  "Create a command to extract audio from a video file using ffmpeg",
  "Write a one-liner to recursively find and replace text in all JavaScript files",
  "Generate a command to check disk usage sorted by size"
];

interface BenchmarkResult {
  modelName: string;
  prompt: string;
  output: string;
  timeMs: number;
  tokensPerSecond?: number;
  error?: string;
}

async function runBenchmark() {
  const results: BenchmarkResult[] = [];
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const outputDir = path.join(process.cwd(), 'benchmark-results');

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  console.log(chalk.blue('Starting model benchmark...'));
  console.log(chalk.yellow(`Testing ${Object.keys(models).length} models with ${prompts.length} prompts each`));

  for (const [i, prompt] of prompts.entries()) {
    for (const [modelName, model] of Object.entries(models)) {
      console.log(chalk.green(`\nTesting model: ${modelName}`));

      const spinner = ora(`Running prompt ${i + 1}/${prompts.length}: "${prompt.substring(0, 30)}..."`).start();

      try {
        const startTime = performance.now();

        const output = await generateText({
          model,
          temperature: 0,
          system: "You are an expert system administrator. Generate only the command with no explanation.",
          prompt,
        });

        const endTime = performance.now();
        const timeMs = endTime - startTime;

        results.push({
          modelName,
          prompt,
          output: output.text.trim(),
          timeMs,
        });
        //show output
        console.log(chalk.blue(`Output: ${output.text.trim()}`));

        spinner.succeed(`Completed in ${timeMs.toFixed(2)}ms`);
      } catch (error: any) {
        spinner.fail(`Failed: ${error.message}`);
        results.push({
          modelName,
          prompt,
          output: '',
          timeMs: 0,
          error: error.message,
        });
      }
    }
  }

  // Generate report
  const reportPath = path.join(outputDir, `benchmark-${timestamp}.json`);
  await fs.writeFile(reportPath, JSON.stringify(results, null, 2));

  // Print summary
  console.log(chalk.blue('\nBenchmark Summary:'));

  // Group by model
  const modelGroups = results.reduce((acc, result) => {
    acc[result.modelName] = acc[result.modelName] || [];
    acc[result.modelName].push(result);
    return acc;
  }, {} as Record<string, BenchmarkResult[]>);

  for (const [model, modelResults] of Object.entries(modelGroups)) {
    const avgTime = modelResults.reduce((sum, r) => sum + r.timeMs, 0) / modelResults.length;
    const successCount = modelResults.filter(r => !r.error).length;
    console.log(`${chalk.green(model)}: Avg time: ${avgTime.toFixed(2)}ms, Success rate: ${successCount}/${modelResults.length}`);
  }

  console.log(chalk.blue(`\nDetailed results saved to ${reportPath}`));
}

// Run the benchmark
runBenchmark().catch(console.error);
