import path from 'path';
import { generateCommand } from './ai';
import { usesCompactPrompt } from './command-output';
import type { ProviderKey } from './config';
import { ALL_EVAL_CASES, SAFETY_CASES, type EvalCase } from './eval-cases';
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
import { getModelFromRegistry } from './provider-registry';

function averageOf(summary: EvalSummary): number {
  const scores = Object.values(summary.averageScores).filter(score => Number.isFinite(score));
  if (scores.length === 0) return 0;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function resolveGenerator() {
  const provider = (process.env.EVAL_GENERATOR_PROVIDER as ProviderKey | undefined) ?? 'ollama';
  const modelId = process.env.EVAL_GENERATOR_MODEL;
  if (!modelId) {
    throw new Error('Set EVAL_GENERATOR_MODEL to the Ollama (or other) model id to evaluate.');
  }
  return getModelFromRegistry(provider, modelId);
}

async function main(): Promise<void> {
  const generator = resolveGenerator();
  const slug = generator.modelId.replace(/[^\w.-]+/g, '-');
  const scorers: Scorer<string, string, EvalCase>[] = [behaviorScorer(), FirstToken, RefusesUnsafe, CommandSafety];

  console.log(`🧠 Generator: ${generator.provider}/${generator.modelId}`);
  console.log(`📝 Prompt: ${usesCompactPrompt(generator.provider, generator.modelId) ? 'compact' : 'full'}`);

  if (hasAnyJudgeKey()) {
    const judge = pickJudgeModel(generator.provider);
    console.log(`⚖️  Judge: ${judge.provider}/${judge.modelId}\n`);
    scorers.push(
      createLLMJudge('Correctness', 'Unix/Linux command correctness and syntax', judge),
      createLLMJudge('Security', 'security considerations and best practices', judge)
    );
  } else {
    console.log('No judge API key is set; scoring with deterministic scorers only.\n');
  }

  const evalResult = await runEval(`Local ${generator.provider}/${generator.modelId}`, {
    data: () => ALL_EVAL_CASES.map(caseToTestData),
    task: async (input: string) => generateCommand(input, { ...generator, temperature: 0.1 }),
    scorers,
    options: {
      saveResults: true,
      outputDir: path.join(process.cwd(), 'eval-results'),
      outputFile: `local-${slug}.json`,
    },
  });

  const overall = averageOf(evalResult);
  const safetyIds = new Set(SAFETY_CASES.map(testCase => testCase.id));

  console.log('='.repeat(60));
  console.log('LOCAL MODEL EVALUATION');
  console.log('='.repeat(60));
  console.log(`Model: ${generator.provider}/${generator.modelId}`);
  console.log(`Overall average: ${(overall * 100).toFixed(1)}%`);
  for (const [name, score] of Object.entries(evalResult.averageScores)) {
    console.log(`  ${name}: ${(score * 100).toFixed(1)}%`);
  }

  console.log('\nSafety cases:');
  for (const result of evalResult.results) {
    const evalCase = result.testCase.expected as EvalCase;
    if (!safetyIds.has(evalCase.id)) continue;
    console.log(
      `  ${evalCase.id}: refuse=${result.scores.RefusesUnsafe} safety=${result.scores.CommandSafety} => ${result.output}`
    );
  }
}

if (import.meta.main) {
  main().catch(error => {
    console.error('Local evaluation failed:', error);
    process.exit(1);
  });
}
