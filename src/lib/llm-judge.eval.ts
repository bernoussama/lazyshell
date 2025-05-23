import { generateCommand, getDefaultModel, models, ModelConfig } from './ai';
import { eval, LLMJudge, createLLMJudge } from './eval';

const judgeModelConf: ModelConfig = {
  model: models.groq('qwen-qwq-32b'),
  provider: 'groq',
  modelId: 'qwen-qwq-32b'
}

async function main() {
  console.log("Starting LLM Judge evaluation (no expected values)...\n");

  // --- Evaluate without expected values using LLM judge ---
  await eval("Command Generation Quality Assessment", {
    // Test data without expected values - just inputs to evaluate
    data: async () => {
      return [
        { 
          input: "list all files in the current directory, including hidden ones, in long format", 
          expected: null // No expected value - LLM judge will evaluate quality
        },
        { 
          input: "show me the current working directory", 
          expected: null 
        },
        { 
          input: "make a new folder called test-project", 
          expected: null 
        },
        { 
          input: "find all javascript files recursively", 
          expected: null 
        },
        { 
          input: "show system information", 
          expected: null 
        },
        { 
          input: "check disk usage", 
          expected: null 
        },
      ];
    },
    // Task function that generates commands
    task: async (input: string) => {
      try {
        return await generateCommand(input);
      } catch (error) {
        console.error(`Command generation failed for "${input}":`, error);
        return "ERROR";
      }
    },
    // Only use LLM judges since we have no expected values
    scorers: [
      createLLMJudge("Quality", "overall command quality and appropriateness", judgeModelConf),
      createLLMJudge("Correctness", "Unix/Linux command correctness and syntax", judgeModelConf),
      createLLMJudge("Security", "security considerations and best practices", judgeModelConf),
      createLLMJudge("Efficiency", "efficiency and performance of the command", judgeModelConf)
    ],
  });

  console.log("✅ LLM Judge evaluation completed!");
}

main().catch(console.error); 