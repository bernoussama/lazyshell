import z from 'zod';
import { generateObject } from 'ai';
import { models, type ModelConfig } from './ai';

const judgeModelConf: ModelConfig = {
  model: models.groq('qwen-qwq-32b'),
  provider: 'groq',
  modelId: 'qwen-qwq-32b'
}

// 1. Core Types and Interfaces

export interface TestData<TInput = any, TExpected = any> {
  input: TInput;
  expected: TExpected;
  [key: string]: any; // Allow additional properties
}

export interface Scorer<TInput = any, TOutput = any, TExpected = any> {
  name: string;
  score: (input: TInput, output: TOutput, expected: TExpected) => Promise<number> | number;
  description?: string;
}

export interface EvalResult<TInput = any, TOutput = any, TExpected = any> {
  testCase: TestData<TInput, TExpected>;
  output: TOutput;
  scores: Record<string, number>;
  error?: string;
}

export interface EvalSummary {
  name: string;
  totalTests: number;
  averageScores: Record<string, number>;
  results: EvalResult[];
}

export interface EvalConfig<TInput = any, TOutput = any, TExpected = any> {
  // Function that returns test data
  data: () => Promise<TestData<TInput, TExpected>[]> | TestData<TInput, TExpected>[];
  // Function that performs the task on input
  task: (input: TInput) => Promise<TOutput> | TOutput;
  // Array of scoring functions
  scorers: Scorer<TInput, TOutput, TExpected>[];
}

// 2. Built-in Scorers

export const ExactMatch: Scorer<any, any, any> = {
  name: 'ExactMatch',
  description: 'Exact string match between output and expected',
  score: (input: any, output: any, expected: any): number => {
    return String(output) === String(expected) ? 1 : 0;
  }
};

export const Levenshtein: Scorer<any, string, string> = {
  name: 'Levenshtein',
  description: 'Normalized Levenshtein distance (1 - distance/max_length)',
  score: (input: any, output: string, expected: string): number => {
    const distance = levenshteinDistance(String(output), String(expected));
    const maxLength = Math.max(String(output).length, String(expected).length);
    
    if (maxLength === 0) return 1; // Both empty strings
    
    return Math.max(0, 1 - distance / maxLength);
  }
};

export const Contains: Scorer<any, string, string> = {
  name: 'Contains',
  description: 'Whether the output contains the expected string',
  score: (input: any, output: string, expected: string): number => {
    return String(output).toLowerCase().includes(String(expected).toLowerCase()) ? 1 : 0;
  }
};

// LLM Judge Scorer - for when no expected value is available
const zLLMJudgeResult = z.object({
  score: z.number().min(1).max(5).describe('A score from 1 to 5 rating the quality of the output'),
  reasoning: z.string().describe('Brief explanation for the score')
});

export function createLLMJudge(
  name: string,
  criteria: string = "quality, relevance, and correctness of the output",
  modelConfig?: ModelConfig
): Scorer<any, any, any> {
  return {
    name,
    description: `AI-powered evaluation based on ${criteria}`,
    score: async (input: any, output: any, expected?: any): Promise<number> => {
      // delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      try {

        const model = modelConfig || judgeModelConf;
        
        const prompt = `You are an expert evaluator. Please rate the following output based on ${criteria}.

Input/Task: ${JSON.stringify(input)}
Output to evaluate: ${JSON.stringify(output)}

Rate the output on a scale of 1-5 where:
1 = Very poor (completely wrong, irrelevant, or unusable)
2 = Poor (mostly wrong with some minor correct elements)
3 = Average (partially correct but has significant issues)
4 = Good (mostly correct with minor issues)
5 = Excellent (completely correct, relevant, and well-formed)

Provide both a score and brief reasoning for your evaluation.`;

        const { object } = await generateObject({
          model: model.model,
          schema: zLLMJudgeResult,
          prompt,
          temperature: 0.1 // Low temperature for consistent scoring
        });

        // Transform 1-5 score to 0-1 scale: (score - 1) / 4
        const normalizedScore = (object.score - 1) / 4;
        
        console.log(`    LLM Judge reasoning: ${object.reasoning}`);
        
        return normalizedScore;
      } catch (error) {
        console.error(`LLM Judge scoring failed: ${error}`);
        return 0; // Default to 0 on error
      }
    }
  };
}

// Convenience export for default LLM judge
export const LLMJudge = createLLMJudge("LLMJudge");

// Helper function for Levenshtein distance
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i;
  }

  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + substitutionCost // substitution
      );
    }
  }

  return matrix[str2.length][str1.length];
}

// 3. Main Evaluation Function

export async function runEval<TInput = any, TOutput = any, TExpected = any>(
  name: string,
  config: EvalConfig<TInput, TOutput, TExpected>
): Promise<EvalSummary> {
  const { data, task, scorers } = config;

  console.log(`🧪 Running evaluation: ${name}`);
  console.log(`📊 Scorers: ${scorers.map(s => s.name).join(', ')}\n`);

  // Get test data
  const testData = await Promise.resolve(data());
  
  if (!Array.isArray(testData) || testData.length === 0) {
    throw new Error('Data function must return a non-empty array of test cases');
  }

  const results: EvalResult<TInput, TOutput, TExpected>[] = [];
  const scoreAccumulators: Record<string, number[]> = {};

  // Initialize score accumulators
  scorers.forEach(scorer => {
    scoreAccumulators[scorer.name] = [];
  });

  // Run evaluation for each test case
  for (let i = 0; i < testData.length; i++) {
    const testCase = testData[i];
    
    console.log(`🔄 Test ${i + 1}/${testData.length}: ${JSON.stringify(testCase.input)}`);

    try {
      // Run the task
      const output = await Promise.resolve(task(testCase.input));
      
      // Calculate scores
      const scores: Record<string, number> = {};
      
      for (const scorer of scorers) {
        try {
          const score = await Promise.resolve(scorer.score(testCase.input, output, testCase.expected));
          scores[scorer.name] = score;
          scoreAccumulators[scorer.name].push(score);
          
          console.log(`  ${scorer.name}: ${score.toFixed(3)}`);
        } catch (error) {
          console.error(`  ${scorer.name}: ERROR - ${error}`);
          scores[scorer.name] = 0;
          scoreAccumulators[scorer.name].push(0);
        }
      }

      results.push({
        testCase,
        output,
        scores
      });

    } catch (error) {
      console.error(`  Task failed: ${error}`);
      
      const errorScores: Record<string, number> = {};
      scorers.forEach(scorer => {
        errorScores[scorer.name] = 0;
        scoreAccumulators[scorer.name].push(0);
      });

      results.push({
        testCase,
        output: undefined as any,
        scores: errorScores,
        error: error instanceof Error ? error.message : String(error)
      });
    }

    console.log(''); // Empty line for readability
  }

  // Calculate average scores
  const averageScores: Record<string, number> = {};
  Object.entries(scoreAccumulators).forEach(([scorerName, scores]) => {
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    averageScores[scorerName] = average;
  });

  // Print summary
  console.log(`📋 Evaluation Summary: ${name}`);
  console.log(`📊 Total tests: ${testData.length}`);
  console.log('📈 Average scores:');
  Object.entries(averageScores).forEach(([scorer, avg]) => {
    console.log(`  ${scorer}: ${avg.toFixed(3)}`);
  });
  console.log('');

  return {
    name,
    totalTests: testData.length,
    averageScores,
    results
  };
}

// Export with the desired interface name
export { runEval as eval };

// 4. Legacy compatibility (for existing code)

export const zEvaluationInput = z.object({
  originalPrompt: z.string(),
  generatedOutput: z.string(),
  referenceOutput: z.string().optional(),
});
export type EvaluationInput = z.infer<typeof zEvaluationInput>;

export const zEvaluationResult = z.object({
  score: z.number().min(1).max(5),
  explanation: z.string(),
});
export type EvaluationResult = z.infer<typeof zEvaluationResult>;

// Legacy evaluation function (kept for backward compatibility)
export async function evaluateGeneration(
  input: EvaluationInput,
  evaluatorModelConfig?: any
): Promise<EvaluationResult> {
  // This is a simplified version for backward compatibility
  // In a real implementation, you might want to use the new eval system
  throw new Error('Legacy evaluateGeneration is deprecated. Use the new eval() function instead.');
}

// Example of how you might batch evaluate (optional for now)
/*
export async function batchEvaluateGenerations(
  inputs: EvaluationInput[],
  evaluatorModelConfig?: ModelConfig
): Promise<EvaluationResult[]> {
  const results: EvaluationResult[] = [];
  for (const input of inputs) {
    try {
      const result = await evaluateGeneration(input, evaluatorModelConfig);
      results.push(result);
    } catch (error) {
      console.error(`Failed to evaluate input: ${JSON.stringify(input)}`, error);
      // Decide how to handle errors, e.g., push a specific error result or skip
      results.push({
        score: 0, // Indicate error
        explanation: `Evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }
  return results;
}
*/

// Utility to get a specific evaluator model (if needed, or rely on ai.ts)
// export function getEvaluatorModel(config?: Config): ModelConfig {
//   // Potentially use a specific model known for good evaluation, or a cost-effective one
//   // For now, reuses the logic from ai.ts
//   return getDefaultModel(); // Or a more specific configuration
// } 