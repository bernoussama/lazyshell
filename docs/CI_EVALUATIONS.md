# CI Evaluations

This document explains how the CI evaluation system works and how to configure it.

## Overview

The CI evaluation system automatically runs quality assessments on every pull request and push to main/develop branches. It uses LLM judges to evaluate the quality of generated commands against various criteria.

## How It Works

1. **Threshold-Based Pass/Fail**: The system uses configurable thresholds to determine if the codebase meets quality standards
2. **Multiple Criteria**: Evaluations check for command quality, Unix/Linux correctness, security best practices, and efficiency
3. **CI Integration**: Runs automatically in GitHub Actions and fails the CI if scores are below thresholds

## Configuration

### Threshold Settings

Edit `src/lib/ci-eval.ts` to adjust the thresholds:

```typescript
const CI_CONFIG: CIEvalConfig = {
  minThreshold: 0.7, // 70% score required to pass (both overall and individual)
  criticalScorers: ['Quality', 'Correctness', 'Security'] // These scorers must individually meet the threshold
};
```

### Parameters

- `minThreshold`: Overall average score required to pass (0-1 scale)
- `criticalScorers`: Array of scorer names that must individually pass the threshold

## Test Cases

The CI evaluations run against these command generation scenarios:

- List files with hidden ones in long format
- Show current working directory  
- Create a new folder
- Find JavaScript files recursively
- Show system information
- Check disk usage

## Scoring Criteria

Each test case is evaluated by 3 LLM judges:

1. **Quality**: General command quality and appropriateness
2. **Correctness**: Unix/Linux command syntax and platform compatibility
3. **Security**: Security considerations and best practices

## GitHub Actions Setup

### Required Secrets

Add these API keys to your GitHub repository secrets:

- `GROQ_API_KEY`: Required for LLM judge evaluations
- `ANTHROPIC_API_KEY`: Optional, fallback model
- `OPENAI_API_KEY`: Optional, fallback model

### Setting Up Secrets

1. Go to your repository on GitHub
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add the required API keys

### Workflow

The CI workflow (`.github/workflows/ci.yml`) includes:

- **Test Job**: Runs unit tests
- **Evaluate Job**: Runs LLM-based evaluations (only if API keys are available)
- **CI Success Job**: Combines results and determines overall pass/fail

## Running Locally

### Prerequisites

1. Set up environment variables:
   ```bash
   export GROQ_API_KEY="your_groq_api_key"
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

### Run Evaluations

```bash
# Run CI evaluations locally
pnpm eval:ci

# Build and run manually
pnpm build
node bin/lib/ci-eval.js
```

### Understanding Output

The evaluation will show:

```
🚀 Starting CI evaluations...
📊 Threshold: 70%
🎯 Critical scorers: LLMJudge

[Individual test results...]

============================================================
🎯 CI EVALUATION RESULTS
============================================================
📊 Overall average score: 85.2%
🎯 Required threshold: 70.0%

🔍 Critical scorer results:
  Quality: 87.5% ✅
  Correctness: 82.3% ✅
  Security: 90.1% ✅

✅ EVALUATION PASSED
All scores meet the required threshold.
```

## Troubleshooting

### Evaluations Skipped

If evaluations are skipped in CI:
- Check that `GROQ_API_KEY` is set in repository secrets
- Verify the secret name matches exactly

### Evaluations Failing

If evaluations consistently fail:
1. Run locally to debug: `pnpm eval:ci`
2. Review the specific scorer results
3. Consider adjusting the threshold in `CI_CONFIG`
4. Check if the AI model responses indicate real quality issues

### API Costs

The evaluations use the Groq API (free tier available). Each run evaluates 6 test cases with 4 scorers = 24 API calls.

## Customization

### Adding Test Cases

Edit the `data` function in `src/lib/ci-eval.ts`:

```typescript
data: async () => {
  return [
    // ... existing test cases ...
    { 
      input: "your new test case", 
      expected: null 
    },
  ];
},
```

### Custom Scorers

Add new evaluation criteria:

```typescript
scorers: [
  // ... existing scorers ...
  createLLMJudge("your custom criteria", judgeModelConf),
],
```

### Different Models

Change the judge model in `judgeModelConf`:

```typescript
const judgeModelConf: ModelConfig = {
  model: models.anthropic('claude-3-haiku-20240307'), // Example
  provider: 'anthropic',
  modelId: 'claude-3-haiku-20240307'
}
```

## Best Practices

1. **Set Appropriate Thresholds**: Start with 0.6-0.7 and adjust based on your quality standards
2. **Monitor Over Time**: Track evaluation trends to catch quality regressions
3. **Use Multiple Criteria**: Don't rely on a single scorer for quality assessment
4. **Regular Review**: Periodically review and update test cases to match evolving requirements 