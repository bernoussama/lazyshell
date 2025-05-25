# LazyShell 🐚

> A smart CLI tool that generates and executes shell commands using AI

LazyShell is a command-line interface that helps you quickly generate and execute shell commands using AI. It supports multiple AI providers and provides an interactive configuration system for easy setup.

## Features ✨

- 🔍 Generates shell commands from natural language descriptions
- ⚡ Supports multiple AI providers (Groq, Google Gemini, OpenRouter, Anthropic, OpenAI, Ollama, Mistral)
- 🔧 Interactive configuration system - no manual environment setup needed
- 🔒 Safe execution with confirmation prompt
- 🚀 Fast and lightweight
- 🔄 Automatic fallback to environment variables
- 💾 Persistent configuration storage
- 📋 **Automatic clipboard integration** - generated commands are copied to clipboard
- 🧪 **Built-in evaluation system for testing AI performance**
- 🏆 **Model benchmarking capabilities**
- 🤖 **LLM Judge evaluation system**
- ⚙️ **CI/CD integration with automated quality checks**

## Installation 📦

### Using npm
```bash
npm install -g lazyshell
```

### Using yarn
```bash
yarn global add lazyshell
```

### Using pnpm (recommended)
```bash
pnpm add -g lazyshell
```

## Quick Start 🚀

1. **First Run**: LazyShell will automatically prompt you to select an AI provider and enter your API key:
   ```bash
   lazyshell "find all files larger than 100MB"
   ```
   
2. **Interactive Setup**: Choose from supported providers:
   - **Groq** - Fast LLaMA models with great performance
   - **Google Gemini** - Google's latest AI models  
   - **OpenRouter** - Access to multiple models including free options
   - **Anthropic Claude** - Powerful reasoning capabilities
   - **OpenAI** - GPT models including GPT-4
   - **Ollama** - Local models (no API key required)
   - **Mistral** - Mistral AI models for code generation

3. **Automatic Configuration**: Your preferences are saved to `~/.lazyshell/config.json` and used for future runs.

4. **Clipboard Integration**: Generated commands are automatically copied to your clipboard for easy pasting.

## Configuration 🔧

### Interactive Setup (Recommended)
On first run, LazyShell will guide you through:
1. Selecting your preferred AI provider
2. Entering your API key (if required)
3. Automatically saving the configuration

### Manual Environment Variables (Optional)
You can still use environment variables as before:

```bash
export GROQ_API_KEY='your-api-key-here'
# OR
export GOOGLE_GENERATIVE_AI_API_KEY='your-api-key-here'
# OR
export OPENROUTER_API_KEY='your-api-key-here'
# OR
export ANTHROPIC_API_KEY='your-api-key-here'  
# OR
export OPENAI_API_KEY='your-api-key-here'
```

### Configuration File Location
- **Linux/macOS**: `~/.lazyshell/config.json`
- **Windows**: `%USERPROFILE%\.lazyshell\config.json`

## Supported AI Providers 🤖

| Provider | Models | API Key Required | Notes |
|----------|--------|------------------|-------|
| **Groq** | LLaMA 3.3 70B | Yes | Fast inference, excellent performance |
| **Google Gemini** | Gemini 2.0 Flash Lite | Yes | Latest Google AI models |
| **OpenRouter** | Multiple models | Yes | Includes free tier options |
| **Anthropic** | Claude 3.5 Haiku | Yes | Advanced reasoning capabilities |
| **OpenAI** | GPT-4o Mini | Yes | Industry standard models |
| **Ollama** | Local models | No | Run models locally |
| **Mistral** | Devstral Small | No | Code-optimized models |

## Usage Examples 🚀

### Basic Usage
```bash
lazyshell "your natural language command description"
```

### Examples
```bash
# Find files
lazyshell "find all JavaScript files modified in the last 7 days"

# System monitoring  
lazyshell "show disk usage sorted by size"

# Process management
lazyshell "find all running node processes"

# Docker operations
lazyshell "list all docker containers with their memory usage"

# File operations
lazyshell "compress all .log files in this directory"
```

### Interactive Features
- **Execute**: Run the generated command immediately
- **Refine**: Modify your prompt to get a better command
- **Cancel**: Exit without running anything
- **Clipboard**: Commands are automatically copied for manual execution

## Evaluation System 🧪

LazyShell includes a flexible evaluation system for testing and benchmarking AI performance:

```typescript
import { eval, Levenshtein, LLMJudge, createLLMJudge } from './lib/eval';

await eval("My Eval", {
  // Test data function
  data: async () => {
    return [{ input: "Hello", expected: "Hello World!" }];
  },
  // Task to perform  
  task: async (input) => {
    return input + " World!";
  },
  // Scoring methods
  scorers: [Levenshtein, LLMJudge],
});
```

### Built-in Scorers
- **ExactMatch**: Perfect string matching
- **Levenshtein**: Edit distance similarity  
- **Contains**: Substring matching
- **LLMJudge**: AI-powered quality evaluation
- **createLLMJudge**: Custom AI judges with specific criteria

### LLM Judge Features
- **AI-Powered Evaluation**: Uses LLMs to evaluate command quality without expected outputs
- **Multiple Criteria**: Quality, correctness, security, efficiency assessments
- **Rate Limiting**: Built-in retry logic and exponential backoff
- **Configurable Models**: Use different AI models for judging

### Features
- Generic TypeScript interfaces for any evaluation task
- Multiple scoring methods per evaluation
- Async support for LLM-based tasks
- Detailed scoring reports with averages
- Error handling for failed test cases

See [docs/EVALUATION.md](docs/EVALUATION.md) for complete documentation.

## Model Benchmarking 🏆

LazyShell includes comprehensive benchmarking capabilities to compare AI model performance:

### Running Benchmarks
```bash
# Build and run benchmarks
pnpm build
node bin/lib/bench_models.js
```

### Benchmark Features
- **Multi-Model Testing**: Compare Groq, Gemini, Ollama, Mistral, and OpenRouter models
- **Performance Metrics**: Response time, success rate, and output quality
- **Standardized Prompts**: Consistent test cases across all models
- **JSON Reports**: Detailed results saved to `benchmark-results/` directory

### Available Models
- `llama-3.3-70b-versatile` (Groq)
- `gemini-2.0-flash-lite` (Google)
- `devstral` (Mistral)
- `ollama3.2` (Ollama)
- Various OpenRouter models

## CI Evaluations 🚦

LazyShell includes automated quality assessments that run in CI to ensure consistent performance:

### Overview
- **Automated Testing**: Runs on every PR and push to main/develop
- **Threshold-Based**: Configurable quality thresholds that must be met
- **LLM Judges**: Uses AI to evaluate command quality, correctness, security, and efficiency
- **GitHub Actions**: Integrated with CI/CD pipeline

### Quick Setup
1. Add `GROQ_API_KEY` to your GitHub repository secrets
2. Evaluations run automatically with 70% threshold by default
3. CI fails if quality scores drop below the threshold

### Local Testing
```bash
# Run the same evaluations locally
pnpm eval:ci

# Manually build and run
pnpm build
node bin/lib/ci-eval.js
```

### Custom Evaluation Scripts
```bash
# Run basic evaluations
pnpm build && node bin/lib/basic.eval.js

# Run LLM judge evaluation
pnpm build && node bin/lib/llm-judge.eval.js

# Test AI library
pnpm build && node bin/lib/test-ai-lib.js
```

See [docs/CI_EVALUATIONS.md](docs/CI_EVALUATIONS.md) for complete setup and configuration guide.

## Development 🛠️

### Prerequisites
- Node.js 18+
- pnpm (recommended)

### Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/lazyshell.git
   cd lazyshell
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Build the project:
   ```bash
   pnpm build
   ```

4. Link the package for local development:
   ```bash
   pnpm link --global
   ```

### Available Scripts
```bash
pnpm start        # Run the built version
pnpm build        # Compile TypeScript
pnpm dev          # Watch mode compilation
pnpm test         # Run Jest tests
pnpm eval:ci      # Run CI evaluations
pnpm x            # Build and run quickly
```

### Running Tests
```bash
pnpm test
```

### Development Features
- **TypeScript**: Full type safety and modern JavaScript features
- **Jest Testing**: Comprehensive test suite
- **Watch Mode**: Auto-compilation during development
- **Modular Architecture**: Clean separation of concerns

## Troubleshooting 🔧

### Configuration Issues
- **Invalid configuration**: Delete `~/.lazyshell/config.json` to reset
- **API key errors**: Run LazyShell again to re-enter your API key
- **Provider not working**: Try switching to a different provider in the configuration

### Environment Variables
LazyShell will automatically fall back to environment variables if the config file is invalid or incomplete.

### Common Issues
- **Clipboard not working**: Ensure your system supports clipboard operations
- **Model timeout**: Some models (especially Ollama) may take longer to respond
- **Rate limiting**: Built-in retry logic handles temporary rate limits

## Contributing 🤝

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Guidelines
- Follow TypeScript best practices
- Add tests for new features
- Update documentation as needed
- Run evaluations before submitting PRs

## License 📄

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Commander.js](https://github.com/tj/commander.js/)
- Interactive prompts powered by [@inquirer/prompts](https://github.com/SBoudrias/Inquirer.js)
- Clipboard integration via [@napi-rs/clipboard](https://github.com/napi-rs/node-rs)
- AI SDK integration with [Vercel AI SDK](https://github.com/vercel/ai)
- Powered by AI models from multiple providers
- Inspired by the need to be lazy (in a good way!)
