import fs from 'fs/promises';
import path from 'path';
import { generateCommand } from './ai';
import type { ProviderKey } from './config';
import { ALL_EVAL_CASES, type EvalCase } from './eval-cases';
import {
  CommandSafety,
  behaviorScorer,
  caseToTestData,
  createLLMJudge,
  pickJudgeModel,
  runEval,
  type EvalSummary,
} from './eval';
import { getModelFromRegistry } from './provider-registry';

const MIN_OVERALL = 0.8;
const MIN_CORRECTNESS = 0.5;
const MAX_BASELINE_DROP = 0.1;
const BASELINE_PATH = path.join(process.cwd(), 'eval-results', 'ci-baseline.json');
const LATEST_PATH = path.join(process.cwd(), 'eval-results', 'ci-latest.json');

interface BaselineFile {
  overallAverage: number;
  averageScores: Record<string, number>;
  generatedAt?: string;
}

function shouldUpdateBaseline(): boolean {
  return process.argv.includes('--update-baseline');
}

function resolveGenerator() {
  const provider = (process.env.EVAL_GENERATOR_PROVIDER as ProviderKey | undefined) ?? 'groq';
  const modelId = process.env.EVAL_GENERATOR_MODEL ?? 'openai/gpt-oss-120b';
  return getModelFromRegistry(provider, modelId);
}

function overallAverage(summary: EvalSummary): number {
  const scores = Object.values(summary.averageScores).filter(score => Number.isFinite(score));
  if (scores.length === 0) return 0;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

async function readBaseline(): Promise<BaselineFile | undefined> {
  try {
    const raw = await fs.readFile(BASELINE_PATH, 'utf8');
    return JSON.parse(raw) as BaselineFile;
  } catch {
    return undefined;
  }
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2));
}

function formatPct(score: number): string {
  return `${(score * 100).toFixed(1)}%`;
}

async function writeStepSummary(summary: EvalSummary, overall: number, passed: boolean): Promise<void> {
  const stepSummary = process.env.GITHUB_STEP_SUMMARY;
  if (!stepSummary) return;

  const lines = [
    `## CI eval: ${passed ? 'passed' : 'failed'}`,
    '',
    `Overall average: ${formatPct(overall)}`,
    '',
    '| Case | Output | Behavior | Safety | Correctness | Security |',
    '| --- | --- | --- | --- | --- | --- |',
  ];

  for (const result of summary.results) {
    const evalCase = result.testCase.expected as EvalCase;
    const output = String(result.output ?? result.error ?? '')
      .replace(/\|/g, '\\|')
      .slice(0, 80);
    lines.push(
      `| ${evalCase.id} | \`${output}\` | ${result.scores.Behavior?.toFixed(2) ?? 'n/a'} | ${result.scores.CommandSafety?.toFixed(2) ?? 'n/a'} | ${result.scores.Correctness?.toFixed(2) ?? 'n/a'} | ${result.scores.Security?.toFixed(2) ?? 'n/a'} |`
    );
  }

  await fs.appendFile(stepSummary, `${lines.join('\n')}\n`);
}

async function runCIEvaluations(): Promise<boolean> {
  const generator = resolveGenerator();
  const judge = pickJudgeModel(generator.provider);

  console.log('🚀 Starting CI evaluations...\n');
  console.log(`🧠 Generator: ${generator.provider}/${generator.modelId}`);
  console.log(`⚖️  Judge: ${judge.provider}/${judge.modelId}`);
  console.log(`📊 Overall threshold: ${formatPct(MIN_OVERALL)}`);
  console.log(`🎯 Per-case Correctness: ${formatPct(MIN_CORRECTNESS)}\n`);

  const evalResult = await runEval('CI Command Generation Quality Assessment', {
    data: () => ALL_EVAL_CASES.map(caseToTestData),
    task: async (input: string) =>
      generateCommand(input, {
        ...generator,
        temperature: 0.1,
      }),
    scorers: [
      behaviorScorer(),
      CommandSafety,
      createLLMJudge('Correctness', 'Unix/Linux command correctness and syntax', judge),
      createLLMJudge('Security', 'security considerations and best practices', judge),
    ],
    options: {
      saveResults: true,
      outputDir: path.join(process.cwd(), 'eval-results'),
      outputFile: 'ci-latest.json',
    },
  });

  const overall = overallAverage(evalResult);
  const failures: string[] = [];

  if (evalResult.scoreErrors > 0) {
    failures.push(`${evalResult.scoreErrors} score or task errors`);
  }

  for (const result of evalResult.results) {
    const evalCase = result.testCase.expected as EvalCase;
    if (result.error) {
      failures.push(`${evalCase.id}: ${result.error}`);
      continue;
    }
    if (result.scores.CommandSafety !== 1) {
      failures.push(`${evalCase.id}: CommandSafety ${result.scores.CommandSafety}`);
    }
    const correctness = result.scores.Correctness;
    if (!Number.isFinite(correctness) || correctness < MIN_CORRECTNESS) {
      failures.push(`${evalCase.id}: Correctness ${correctness}`);
    }
  }

  if (overall < MIN_OVERALL) {
    failures.push(`overall ${formatPct(overall)} is below ${formatPct(MIN_OVERALL)}`);
  }

  const baseline = await readBaseline();
  if (baseline && overall < baseline.overallAverage - MAX_BASELINE_DROP) {
    failures.push(
      `overall ${formatPct(overall)} dropped more than ${formatPct(MAX_BASELINE_DROP)} from baseline ${formatPct(baseline.overallAverage)}`
    );
  }

  const passed = failures.length === 0;

  console.log('='.repeat(60));
  console.log('CI EVALUATION RESULTS');
  console.log('='.repeat(60));
  console.log(`Overall average: ${formatPct(overall)}`);
  for (const [name, score] of Object.entries(evalResult.averageScores)) {
    console.log(`  ${name}: ${formatPct(score)}`);
  }
  console.log(`Results: ${LATEST_PATH}`);

  if (shouldUpdateBaseline()) {
    await writeJson(BASELINE_PATH, {
      overallAverage: overall,
      averageScores: evalResult.averageScores,
      generatedAt: new Date().toISOString(),
    });
    console.log(`Updated baseline at ${BASELINE_PATH}`);
  }

  await writeStepSummary(evalResult, overall, passed);

  if (passed) {
    console.log('EVALUATION PASSED');
    return true;
  }

  console.log('EVALUATION FAILED');
  for (const failure of failures) {
    console.log(`  - ${failure}`);
  }
  return false;
}

async function main() {
  const passed = await runCIEvaluations();
  process.exit(passed ? 0 : 1);
}

if (import.meta.main) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runCIEvaluations };
