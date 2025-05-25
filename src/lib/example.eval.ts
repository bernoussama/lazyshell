import { eval, Levenshtein, ExactMatch, Contains } from './eval';

// Example 1: Simple string concatenation task
async function basicStringExample() {
  return await eval('Basic String Concatenation', {
    // Test data function
    data: async () => {
      return [
        { input: 'Hello', expected: 'Hello World!' },
        { input: 'Hi', expected: 'Hi World!' },
        { input: 'Hey', expected: 'Hey World!' },
      ];
    },
    // Task function
    task: async (input: string) => {
      return input + ' World!';
    },
    // Scoring methods
    scorers: [ExactMatch, Levenshtein],
  });
}

// Example 2: Command generation evaluation
async function commandGenerationExample() {
  return await eval('Command Generation', {
    data: () => [
      {
        input: 'list all files in current directory',
        expected: 'ls -la',
      },
      {
        input: 'show current directory',
        expected: 'pwd',
      },
      {
        input: 'remove a file named test.txt',
        expected: 'rm test.txt',
      },
    ],
    task: (input: string) => {
      // Simple rule-based command generation (for demo)
      if (input.includes('list') && input.includes('files')) {
        return 'ls -la';
      }
      if (input.includes('current directory')) {
        return 'pwd';
      }
      if (input.includes('remove') && input.includes('test.txt')) {
        return 'rm test.txt';
      }
      return 'unknown';
    },
    scorers: [ExactMatch, Contains, Levenshtein],
  });
}

// Example 3: LLM-based evaluation (you would replace this with actual LLM calls)
async function llmExample() {
  return await eval('LLM Generation', {
    data: async () => [
      {
        input: 'Explain recursion',
        expected: 'function that calls itself',
      },
      {
        input: 'What is a variable?',
        expected: 'container for data',
      },
    ],
    task: async (input: string) => {
      // This would be your actual LLM call
      // For demo purposes, return a mock response
      if (input.includes('recursion')) {
        return 'A function that calls itself to solve problems';
      }
      if (input.includes('variable')) {
        return 'A container that stores data values';
      }
      return "I don't know";
    },
    scorers: [Contains, Levenshtein],
  });
}

// Run examples
async function runExamples() {
  console.log('🚀 Running evaluation examples...\n');

  try {
    await basicStringExample();
    await commandGenerationExample();
    await llmExample();

    console.log('✅ All examples completed!');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// Export for use
export { runExamples, basicStringExample, commandGenerationExample, llmExample };
