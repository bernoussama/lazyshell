import { generateCommand, getDefaultModel } from './ai';
import { ALL_EVAL_CASES } from './eval-cases';
import {
  CommandSafety,
  FirstToken,
  behaviorScorer,
  caseToTestData,
  createLLMJudge,
  hasAnyJudgeKey,
  pickJudgeModel,
  runEval,
} from './eval';

async function main() {
  console.log('Starting basic evaluations...\n');

  const scorers = [behaviorScorer(), FirstToken, CommandSafety];

  if (hasAnyJudgeKey()) {
    const judge = pickJudgeModel();
    scorers.push(
      createLLMJudge('Correctness', 'Unix/Linux command correctness, compatibility, and security best practices', judge)
    );
  }

  await runEval('Generate Command Evaluation', {
    data: () => ALL_EVAL_CASES.map(caseToTestData),
    task: async (input: string) => generateCommand(input, getDefaultModel()),
    scorers,
  });

  console.log('Basic evaluation completed!');
}

if (import.meta.main) {
  main().catch(console.error);
}
