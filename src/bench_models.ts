import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { performance } from 'perf_hooks';
import { getBenchmarkModels, generateBenchmarkText, Command, generateCommandStruct, ModelConfig } from './lib/ai';


// Get the models to benchmark from our AI library
const models = getBenchmarkModels();

// Define benchmark prompts
const prompts = [
  "Generate a bash command to find all files over 100MB in the current directory",
  "Write a command to list all running docker containers with their memory usage",
  "Create a command to extract audio from a video file using ffmpeg",
  "Write a one-liner to recursively find and replace text in all JavaScript files",
  "Generate a command to check disk usage sorted by size",
  "docker show container images and their sizes"
];

interface BenchmarkResult {
  modelName: string;
  prompt: string;
  output: Command | null;
  timeMs: number;
  tokensPerSecond?: number;
  error?: string;
}

interface ModelSummary {
  avgTime: number;
  successCount: number;
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

        // const output = await generateBenchmarkText(model, prompt);
        const languageModel: ModelConfig = { provider: model.provider, modelId: model.modelId, model };
        const output = await generateCommandStruct(prompt, languageModel);

        const endTime = performance.now();
        const timeMs = endTime - startTime;

        results.push({
          modelName,
          prompt,
          output: output,
          timeMs,
        });
        //show output
        console.log(chalk.blue(`Output: ${output.command}`));

        spinner.succeed(`Completed in ${timeMs.toFixed(2)}ms`);
      } catch (error: any) {
        spinner.fail(`Failed: ${error.message}`);
        results.push({
          modelName,
          prompt,
          output: null,
          timeMs: 0,
          error: error.message,
        });
      }
    }
  }

  // Print summary
  console.log(chalk.blue('\nBenchmark Summary:'));

  // Group by model
  const modelGroups = results.reduce((acc, result) => {
    acc[result.modelName] = acc[result.modelName] || [];
    acc[result.modelName].push(result);
    return acc;
  }, {} as Record<string, BenchmarkResult[]>);

  const summary: Record<string, ModelSummary> = {};
  for (const [model, modelResults] of Object.entries(modelGroups)) {
    const avgTime = modelResults.reduce((sum, r) => sum + r.timeMs, 0) / modelResults.length;
    const successCount = modelResults.filter(r => !r.error).length;
    summary[model] = {
      avgTime,
      successCount,
    }
    console.log(`${chalk.green(model)}: Avg time: ${avgTime.toFixed(2)}ms, Success rate: ${successCount}/${modelResults.length}`);
  }

  // Generate report
  const reportPath = path.join(outputDir, `benchmark-${timestamp}.json`);
  await fs.writeFile(reportPath, JSON.stringify({ results, summary }, null, 2));

  console.log(chalk.blue(`\nDetailed results saved to ${reportPath}`));
}

// Run the benchmark
runBenchmark().catch(console.error);
