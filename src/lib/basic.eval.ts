import { generateCommand, generateBenchmarkText, getDefaultModel, models } from './ai';
import { eval, ExactMatch, Contains, Levenshtein, LLMJudge, createLLMJudge } from './eval';

async function main() {
  console.log("Starting basic evaluations...\n");

  // --- Evaluate generateCommand with new interface ---
  await eval("Generate Command Evaluation", {
    // Test data for command generation
    data: async () => {
      return [
        { 
          input: "list all files in the current directory, including hidden ones, in long format", 
          expected: "ls -la" 
        },
        { 
          input: "show current working directory", 
          expected: "pwd" 
        },
        { 
          input: "create a new directory named test", 
          expected: "mkdir test" 
        },
        { 
          input: "find all python files in current directory", 
          expected: "find . -name '*.py'" 
        },
      ];
    },
    // Task function that calls generateCommand
    task: async (input: string) => {
      try {
        return await generateCommand(input);
      } catch (error) {
        console.error(`Command generation failed for "${input}":`, error);
        return "ERROR";
      }
    },
    // Scoring methods - now includes LLM judge
    scorers: [
      ExactMatch, 
      Contains, 
      Levenshtein,
      LLMJudge,
      createLLMJudge("command correctness, Unix/Linux compatibility, and security best practices")
    ],
  });

  console.log("✅ Basic evaluation completed!");
}

main().catch(console.error); 