import { generateCommand, getDefaultModel, models, ModelConfig } from './ai';
import { eval, LLMJudge, createLLMJudge, EvalSummary } from './eval';

const judgeModelConf: ModelConfig = {
  model: models.groq('qwen-qwq-32b'),
  provider: 'groq',
  modelId: 'qwen-qwq-32b'
}

// Configuration for CI thresholds
interface CIEvalConfig {
  minThreshold: number; // Minimum score to pass (0-1 scale)
  criticalScorers?: string[]; // Scorers that must individually pass the threshold
}

const CI_CONFIG: CIEvalConfig = {
  minThreshold: 0.7, // 70% score required to pass (both overall and individual)
  criticalScorers: ['Quality', 'Correctness', 'Security'] // These scorers must individually meet the threshold
};

async function runCIEvaluations(): Promise<boolean> {
  console.log("🚀 Starting CI evaluations...\n");
  console.log(`📊 Threshold: ${CI_CONFIG.minThreshold * 100}%`);
  console.log(`🎯 Critical scorers: ${CI_CONFIG.criticalScorers?.join(', ') || 'None'}\n`);

  try {
    // Run the LLM Judge evaluation
    const evalResult: EvalSummary = await eval("CI Command Generation Quality Assessment", {
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
          return await generateCommand(input, {
            ...getDefaultModel(),
            temperature: 0.1
          })
        } catch (error) {
          console.error(`Command generation failed for "${input}":`, error);
          return "ERROR";
        }
      },
      // Only use LLM judges since we have no expected values
      scorers: [
        { ...createLLMJudge("overall command quality and appropriateness", judgeModelConf), name: "Quality" },
        { ...createLLMJudge("Unix/Linux command correctness and syntax", judgeModelConf), name: "Correctness" },
        { ...createLLMJudge("security considerations and best practices", judgeModelConf), name: "Security" },
        // { ...createLLMJudge("efficiency and performance of the command", judgeModelConf), name: "Efficiency" }
      ],
    });

    // Calculate overall average score
    const allScores = Object.values(evalResult.averageScores);
    const overallAverage = allScores.reduce((sum, score) => sum + score, 0) / allScores.length;

    console.log("\n" + "=".repeat(60));
    console.log("🎯 CI EVALUATION RESULTS");
    console.log("=".repeat(60));
    console.log(`📊 Overall average score: ${(overallAverage * 100).toFixed(1)}%`);
    console.log(`🎯 Required threshold: ${(CI_CONFIG.minThreshold * 100).toFixed(1)}%`);
    console.log("");

    // Check individual scorer thresholds
    let criticalScoresPassed = true;
    if (CI_CONFIG.criticalScorers) {
      console.log("🔍 Critical scorer results:");
      for (const criticalScorer of CI_CONFIG.criticalScorers) {
        const score = evalResult.averageScores[criticalScorer];
        
        if (score !== undefined) {
          const passed = score >= CI_CONFIG.minThreshold;
          console.log(`  ${criticalScorer}: ${(score * 100).toFixed(1)}% ${passed ? '✅' : '❌'}`);
          if (!passed) criticalScoresPassed = false;
        } else {
          console.log(`  ${criticalScorer}: NOT FOUND ❌`);
          criticalScoresPassed = false;
        }
      }
      console.log("");
    }

    // Determine if evaluation passed
    const overallPassed = overallAverage >= CI_CONFIG.minThreshold;
    const allPassed = overallPassed && criticalScoresPassed;

    if (allPassed) {
      console.log("✅ EVALUATION PASSED");
      console.log("All scores meet the required threshold.");
      return true;
    } else {
      console.log("❌ EVALUATION FAILED");
      if (!overallPassed) {
        console.log(`Overall average score (${(overallAverage * 100).toFixed(1)}%) is below threshold (${(CI_CONFIG.minThreshold * 100).toFixed(1)}%)`);
      }
      if (!criticalScoresPassed) {
        console.log("One or more critical scorers failed to meet the threshold");
      }
      return false;
    }

  } catch (error) {
    console.error("❌ CI evaluation failed with error:", error);
    return false;
  }
}

async function main() {
  const passed = await runCIEvaluations();
  
  // Exit with appropriate code for CI
  if (passed) {
    console.log("\n🎉 CI evaluations completed successfully!");
    process.exit(0);
  } else {
    console.log("\n💥 CI evaluations failed!");
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });
}

export { runCIEvaluations, CI_CONFIG }; 