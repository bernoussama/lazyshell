# Evaluation System

The evaluation system provides a flexible and abstract interface for testing and scoring various tasks, from simple string operations to complex LLM-based generation.

## Quick Start

```typescript
import { eval, Levenshtein } from './lib/eval';

const result = await eval("My Eval", {
  // A function that returns an array of test data
  data: async () => {
    return [{ input: "Hello", expected: "Hello World!" }];
  },
  // The task to perform
  task: async (input) => {
    return input + " World!";
  },
  // The scoring methods for the eval
  scorers: [Levenshtein],
});
```

## Core Concepts

### Test Data
Each test case should have at minimum an `input` and `expected` field:
```typescript
interface TestData<TInput = any, TExpected = any> {
  input: TInput;
  expected: TExpected;
  [key: string]: any; // Allow additional properties
}
```

### Task Function
The task function receives an input and returns an output to be scored:
```typescript
task: (input: TInput) => Promise<TOutput> | TOutput
```

### Scorers
Scorers compare the task output with the expected result and return a numerical score:
```typescript
interface Scorer<TInput = any, TOutput = any, TExpected = any> {
  name: string;
  score: (input: TInput, output: TOutput, expected: TExpected) => Promise<number> | number;
  description?: string;
}
```

## Built-in Scorers

### ExactMatch
Returns 1 for exact matches, 0 otherwise:
```typescript
import { ExactMatch } from './lib/eval';
```

### Levenshtein
Normalized Levenshtein distance (1 - distance/max_length):
```typescript
import { Levenshtein } from './lib/eval';
```

### Contains
Checks if output contains the expected string (case-insensitive):
```typescript
import { Contains } from './lib/eval';
```

## Examples

### Simple String Task
```typescript
await eval("String Concatenation", {
  data: () => [
    { input: "Hello", expected: "Hello World!" },
    { input: "Hi", expected: "Hi World!" }
  ],
  task: (input: string) => input + " World!",
  scorers: [ExactMatch, Levenshtein]
});
```

### LLM Evaluation
```typescript
import { generateCommand } from './ai';

await eval("Command Generation", {
  data: () => [
    { input: "list all files", expected: "ls -la" },
    { input: "show directory", expected: "pwd" }
  ],
  task: async (input: string) => {
    return await generateCommand(input);
  },
  scorers: [ExactMatch, Contains, Levenshtein]
});
```

### Custom Scorer
```typescript
const CustomScorer: Scorer = {
  name: 'CustomScore',
  description: 'Custom scoring logic',
  score: (input, output, expected) => {
    // Your custom scoring logic here
    return Math.random(); // Example
  }
};

await eval("Custom Evaluation", {
  data: () => [/* test data */],
  task: (input) => {/* task logic */},
  scorers: [CustomScorer]
});
```

## Results

The evaluation returns a summary with:
- Test case details
- Individual scores for each scorer
- Average scores across all test cases
- Error information for failed tests

```typescript
interface EvalSummary {
  name: string;
  totalTests: number;
  averageScores: Record<string, number>;
  results: EvalResult[];
}
```

## Migration from Legacy API

The old `evaluateGeneration` function is deprecated. Migrate to the new interface:

**Old:**
```typescript
const result = await evaluateGeneration({
  originalPrompt: "test",
  generatedOutput: "output",
  referenceOutput: "reference"
});
```

**New:**
```typescript
const result = await eval("Test", {
  data: () => [{ input: "test", expected: "reference" }],
  task: () => "output",
  scorers: [Levenshtein]
});
``` 