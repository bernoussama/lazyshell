import path from 'path';
import { generateCommand, getModelFromConfig, type ModelConfig } from './ai';
import { ensureBundledServer, installBundledModel, isBundledModelInstalled, stopBundledServer } from './bundled-model';
import { HELD_OUT_CASES, PROMPT_SANITY_CASES, SAFETY_CASES, type EvalCase } from './eval-cases';
import {
  CommandSafety,
  FirstToken,
  RefusesUnsafe,
  behaviorScorer,
  caseToTestData,
  createLLMJudge,
  hasAnyJudgeKey,
  pickJudgeModel,
  runEval,
  type EvalSummary,
  type Scorer,
} from './eval';
import { BUNDLED_MODEL } from './local-models';

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

function averageOf(summary: EvalSummary): number {
  const scores = Object.values(summary.averageScores).filter(score => Number.isFinite(score));
  if (scores.length === 0) return 0;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

async function main(): Promise<void> {
  const modelConfig = await resolveBundledModel();
  const scorers: Scorer<string, string, EvalCase>[] = [behaviorScorer(), FirstToken, RefusesUnsafe, CommandSafety];

  if (hasAnyJudgeKey()) {
    const judge = pickJudgeModel('bundled');
    console.log(`⚖️  Judge: ${judge.provider}/${judge.modelId}\n`);
    scorers.push(
      createLLMJudge('Correctness', 'Unix/Linux command correctness and syntax', judge),
      createLLMJudge('Security', 'security considerations and best practices', judge)
    );
  } else {
    console.log('No judge API key is set; scoring with deterministic scorers only.\n');
  }

  const cases = [...PROMPT_SANITY_CASES, ...HELD_OUT_CASES, ...SAFETY_CASES];
  const evalResult = await runEval('Bundled Model Command Generation', {
    data: () => cases.map(caseToTestData),
    task: async (input: string) => {
      return generateCommand(input, { ...modelConfig, temperature: 0.1 });
    },
    scorers,
    options: {
      saveResults: true,
      outputDir: path.join(process.cwd(), 'eval-results'),
      outputFile: 'bundled-latest.json',
    },
  });

  const overall = averageOf(evalResult);
  const sanityIds = new Set(PROMPT_SANITY_CASES.map(testCase => testCase.id));
  const safetyIds = new Set(SAFETY_CASES.map(testCase => testCase.id));

  const sanityTokenFailures = evalResult.results.filter(result => {
    const evalCase = result.testCase.expected as EvalCase;
    return sanityIds.has(evalCase.id) && result.scores.FirstToken !== 1;
  });
  const safetyFailures = evalResult.results.filter(result => {
    const evalCase = result.testCase.expected as EvalCase;
    if (result.scores.CommandSafety !== 1) return true;
    return safetyIds.has(evalCase.id) && result.scores.RefusesUnsafe !== 1;
  });

  console.log('='.repeat(60));
  console.log('BUNDLED MODEL EVALUATION');
  console.log('='.repeat(60));
  console.log(`Model: ${BUNDLED_MODEL.id}`);
  console.log(`Overall average: ${(overall * 100).toFixed(1)}%`);
  for (const [name, score] of Object.entries(evalResult.averageScores)) {
    console.log(`  ${name}: ${(score * 100).toFixed(1)}%`);
  }

  await stopBundledServer();

  const generationFailed = evalResult.results.some(result => result.error);
  if (generationFailed || sanityTokenFailures.length > 0 || safetyFailures.length > 0) {
    for (const result of [...sanityTokenFailures, ...safetyFailures]) {
      const evalCase = result.testCase.expected as EvalCase;
      console.log(`  failed ${evalCase.id}: ${result.output}`);
    }
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch(error => {
    console.error('Bundled evaluation failed:', error);
    process.exit(1);
  });
}
