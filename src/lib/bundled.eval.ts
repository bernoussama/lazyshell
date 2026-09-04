import fs from 'fs/promises';
import path from 'path';
import { generateCommand, getModelFromConfig, models, type ModelConfig } from './ai';
import { ensureBundledServer, installBundledModel, isBundledModelInstalled } from './bundled-model';
import { Contains, createLLMJudge, eval as runEval, type EvalSummary, type Scorer } from './eval';
import { BUNDLED_MODEL } from './local-models';

interface BundledCase {
  input: string;
  expected: string;
}

const CASES: BundledCase[] = [
  {
    input: 'list all files in the current directory, including hidden ones, in long format',
    expected: 'ls',
  },
  {
    input: 'show me the current working directory',
    expected: 'pwd',
  },
  {
    input: 'make a new folder called test-project',
    expected: 'mkdir',
  },
  {
    input: 'find all javascript files recursively',
    expected: 'find',
  },
  {
    input: 'show system information',
    expected: 'uname',
  },
  {
    input: 'check disk usage',
    expected: 'df',
  },
];

const CommandShape: typeof Contains = {
  name: 'ExpectedToken',
  description: 'Output contains the expected command token',
  score: Contains.score,
};

function hasGroqKey(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

async function resolveBundledModel(): Promise<ModelConfig> {
  if (!(await isBundledModelInstalled())) {
    console.log(`Downloading ${BUNDLED_MODEL.displayName} (~${Math.round(BUNDLED_MODEL.sizeBytes / 1_000_000)} MB)...`);
    await installBundledModel((downloaded, total) => {
      if (total > 0 && downloaded % (20 * 1_000_000) < 64_000) {
        process.stdout.write(`\r  ${Math.round((downloaded / total) * 100)}%`);
      }
    });
    process.stdout.write('\n');
  }

  console.log('Starting bundled llama-server...');
  const baseUrl = await ensureBundledServer();
  return getModelFromConfig({
    provider: 'bundled',
    model: BUNDLED_MODEL.id,
    baseUrl,
    version: BUNDLED_MODEL.version,
    bundledModel: {
      status: 'installed',
      version: BUNDLED_MODEL.version,
      sha256: BUNDLED_MODEL.sha256,
    },
  });
}

async function writeResults(summary: EvalSummary): Promise<string> {
  const outDir = path.join(process.cwd(), 'eval-results');
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `eval-bundled-${Date.now()}.json`);
  await fs.writeFile(
    outPath,
    JSON.stringify(
      {
        model: BUNDLED_MODEL.id,
        license: BUNDLED_MODEL.license,
        generatedAt: new Date().toISOString(),
        ...summary,
      },
      null,
      2
    )
  );
  return outPath;
}

async function main(): Promise<void> {
  const modelConfig = await resolveBundledModel();
  const scorers: Scorer[] = [CommandShape];

  if (hasGroqKey()) {
    const judgeModelConf: ModelConfig = {
      model: models.groq('openai/gpt-oss-20b'),
      provider: 'groq',
      modelId: 'openai/gpt-oss-20b',
    };
    scorers.push(
      createLLMJudge('Quality', 'overall command quality and appropriateness', judgeModelConf),
      createLLMJudge('Correctness', 'Unix/Linux command correctness and syntax', judgeModelConf)
    );
  } else {
    console.log('GROQ_API_KEY is not set; scoring with ExpectedToken only.\n');
  }

  const evalResult = await runEval('Bundled Model Command Generation', {
    data: async () => CASES,
    task: async (input: string) => {
      const command = await generateCommand(input, { ...modelConfig, temperature: 0.1 });
      console.log(`  generated: ${command}`);
      return command;
    },
    scorers,
  });

  const allScores = Object.values(evalResult.averageScores);
  const overall = allScores.reduce((sum, score) => sum + score, 0) / allScores.length;
  const outPath = await writeResults(evalResult);

  console.log('='.repeat(60));
  console.log('BUNDLED MODEL EVALUATION');
  console.log('='.repeat(60));
  console.log(`Model: ${BUNDLED_MODEL.id}`);
  console.log(`Overall average: ${(overall * 100).toFixed(1)}%`);
  for (const [name, score] of Object.entries(evalResult.averageScores)) {
    console.log(`  ${name}: ${(score * 100).toFixed(1)}%`);
  }
  console.log(`Results: ${outPath}`);

  const generationFailed = evalResult.results.some(result => result.error || result.output === 'ERROR');
  if (generationFailed) {
    process.exit(1);
  }
}

if (require.main === module || require.main === undefined) {
  main().catch(error => {
    console.error('Bundled evaluation failed:', error);
    process.exit(1);
  });
}
