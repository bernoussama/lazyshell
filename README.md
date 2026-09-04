
<div align="center">

# LazyShell

<img width="200" align="center" alt="lsh-logo" src="https://github.com/user-attachments/assets/f94fbe8d-0be9-474c-9321-4caa27091c0f" />
</div>

<div align="center">

[![npm version](https://badge.fury.io/js/lazyshell.svg)](https://badge.fury.io/js/lazyshell)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI](https://github.com/bernoussama/lazyshell/workflows/CI/badge.svg)](https://github.com/bernoussama/lazyshell/actions)
[![Evals](https://github.com/bernoussama/lazyshell/workflows/Evals/badge.svg)](https://github.com/bernoussama/lazyshell/actions)
[![AI Powered](https://img.shields.io/badge/AI-Powered-blue?logo=huggingface&logoColor=white)](https://github.com/bernoussama/lazyshell)
![NPM Downloads](https://img.shields.io/npm/d18m/lazyshell)

</div>

<h4 align="center">

A smart CLI tool that generates and executes shell commands using AI

</h4>

<p align="center">
   <img alt="Gif Demo" width="100%" src="https://github.com/user-attachments/assets/1699d100-d73a-43d9-8b69-5ba8e50fcdc7" >
</p>

LazyShell is a command-line interface that helps you quickly generate and execute shell commands using AI. It supports multiple AI providers and provides an interactive configuration system for easy setup.

## Features ✨

-  Generates shell commands from natural language descriptions
-  Supports multiple AI providers (Groq, Google Gemini, OpenRouter, Anthropic, OpenAI, Ollama, Mistral)
-  Interactive configuration system - no manual environment setup needed
-  Safe execution with confirmation prompt
-  Fast and lightweight
-  Automatic fallback to environment variables
-  Persistent configuration storage
-  **Automatic clipboard integration** - generated commands are copied to clipboard
-  **Built-in evaluation system for testing AI performance**
-  **Model benchmarking capabilities**
-  **LLM Judge evaluation system**
-  **CI/CD integration with automated quality checks**
-  **System-aware command generation** - detects OS, distro, and package manager
-  **Command refinement** - iteratively improve commands with AI feedback

## Installation 📦

### Using npm

```bash
npm install -g lazyshell
```

### Using yarn

```bash
yarn global add lazyshell
```

### Using pnpm

```bash
pnpm add -g lazyshell
```

### Using bun (recommended)

```bash
bun add -g lazyshell
```

### Using Install Script (experimental)

```bash
curl -fsSL https://raw.githubusercontent.com/bernoussama/lazyshell/main/install | bash
```

## Quick Start

1. **First Run**: LazyShell will automatically prompt you to select an AI provider and enter your API key:

   ```bash
   lazyshell "find all files larger than 100MB"
   # or use the short alias
   lsh "find all files larger than 100MB"
   ```

2. **Interactive Setup**: Choose from supported providers:
   - **Groq** - Fast GPT-OSS models with great performance
   - **Google Gemini** - Google's latest AI models  
   - **OpenRouter** - Access to multiple models including free options
   - **Anthropic Claude** - Powerful reasoning capabilities
   - **OpenAI** - GPT models including GPT-4
   - **Ollama** - Local models (no API key required)
   - **Mistral** - Mistral AI models for code generation
   - **LMStudio** - Local models via LMStudio (experimental, no API key required)
   - **Bundled** - Optional ~469 MB Qwen2.5-Coder 0.5B GGUF (downloaded on Yes, no Ollama required)

3. **Automatic Configuration**: Your preferences are saved to `~/.lazyshell/config.json` and used for future runs.

4. **Clipboard Integration**: Generated commands are automatically copied to your clipboard for easy pasting.

## Configuration

### Interactive Setup (Recommended)

On first run, LazyShell will guide you through:

1. Optionally downloading the bundled local model (~469 MB)
2. Selecting your preferred AI provider
3. Entering your API key (if required)
4. Automatically saving the configuration

Skip the download prompt with `--skip-bundled-model` or `LSH_SKIP_BUNDLED_MODEL=1`. The choice is saved; use `lazyshell model install` or `lazyshell model remove` later.

### Configuration Management

```bash
# Open configuration UI
lazyshell config

# Bundled local model
lazyshell model install
lazyshell model remove
```

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

> **Note**: Ollama, LM Studio, and the bundled local model don't require API keys.

### Configuration File Location

- **Linux/macOS**: `~/.lazyshell/config.json`
- **Windows**: `%USERPROFILE%\.lazyshell\config.json`

## Supported AI Providers

| Provider | Models | API Key Required | Notes |
|----------|--------|------------------|-------|
| **Groq** | GPT-OSS 120B | Yes | Fast inference, excellent performance |
| **Google Gemini** | Gemini 2.0 Flash Lite | Yes | Latest Google AI models |
| **OpenRouter** | Multiple models | Yes | Includes free tier options |
| **Anthropic** | Claude 3.5 Haiku | Yes | Advanced reasoning capabilities |
| **OpenAI** | GPT-4o Mini | Yes | Industry standard models |
| **Ollama** | Curated local catalog (see below) | No | Run models locally |
| **Mistral** | Devstral Small | No | Code-optimized models |
| **LMStudio** | Curated local catalog | No | **Experimental** - Local models via LMStudio |
| **Bundled** | Qwen2.5-Coder 0.5B Instruct Q4_K_M | No | Optional ~469 MB GGUF, Apache-2.0 |

## Local models

Ollama and LM Studio stay first-class. When you pick either provider, LazyShell offers a catalog plus Custom…:

- CPU / small: `qwen2.5-coder:0.5b`, `qwen2.5-coder:1.5b` (default), `hf.co/AryaYT/nl2shell-0.8b`
- GPU: `qwen2.5-coder:3b`, `qwen2.5-coder:7b`, `westenfelder/NL2SH`

Command-only NL2SH fine-tunes may skip explanations and ignore OS/package-manager context. Prefer Qwen2.5-Coder instruct models when you want LazyShell’s full system prompt.

### Bundled model (opt-in / opt-out)

The npm package does **not** contain weights. On first setup you can download [Qwen2.5-Coder-0.5B-Instruct Q4_K_M](https://huggingface.co/Qwen/Qwen2.5-Coder-0.5B-Instruct-GGUF) (~469 MB, Apache-2.0) to `~/.lazyshell/models/`. The file is checksum-verified.

- **Yes** on first run: download, then use the bundled provider if Ollama is not running and no cloud API key is set.
- **No**: remembered as declined; you will not be asked again until `lazyshell config` or `lazyshell model install`.
- **Skip**: `lazyshell --skip-bundled-model "..."` or `LSH_SKIP_BUNDLED_MODEL=1`.

If the configured provider is Ollama but Ollama is down and the bundled model is installed, LazyShell starts a local `llama-server` (downloaded once for your OS) and uses that instead.

## Usage Examples

### Basic Usage

```bash
lazyshell "your natural language command description"
# or use the short alias
lsh "your natural language command description"
```

### Silent Mode

```bash
lazyshell -s "find all JavaScript files"  # No explanation, just the command
lsh --silent "show disk usage"            # Same with long flag
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

# Package management (system-aware)
lazyshell "install docker"  # Uses apt/yum/pacman/etc based on your distro
```

### Interactive Features

- **Execute**: Run the generated command immediately
- **Refine**: Modify your prompt to get a better command
- **Cancel**: Exit without running anything
- **Clipboard**: Commands are automatically copied for manual execution

## System Intelligence

LazyShell automatically detects your system environment:

- **Operating System**: Linux, macOS, Windows
- **Linux Distribution**: Ubuntu, Fedora, Arch, etc.
- **Package Manager**: apt, yum, dnf, pacman, zypper, etc.
- **Shell**: bash, zsh, fish, etc.
- **Current Directory**: Provides context for relative paths

This enables LazyShell to generate system-appropriate commands and suggest the right package manager for installations.

## Evaluation System

LazyShell includes a flexible evaluation system for testing and benchmarking AI performance:

```typescript
import { runEval, Levenshtein, createLLMJudge, pickJudgeModel } from './lib/eval';

await runEval("My Eval", {
  data: async () => {
    return [{ input: "Hello", expected: "Hello World!" }];
  },
  task: async (input) => {
    return input + " World!";
  },
  scorers: [Levenshtein, createLLMJudge('Quality', 'overall quality', pickJudgeModel())],
});
```

### Built-in Scorers

- **ExactMatch**: Perfect string matching
- **Levenshtein**: Edit distance similarity
- **Contains**: Substring matching
- **FirstToken**: First command token must be in an accept list
- **RefusesUnsafe / CommandSafety**: Refusal and destructive-command gates
- **createLLMJudge**: AI judge with platform context (temperature 0)
- **pickJudgeModel**: Prefer a judge provider other than the generator

See [docs/EVALUATION.md](docs/EVALUATION.md) for complete documentation.

## Model Benchmarking

LazyShell includes comprehensive benchmarking capabilities to compare AI model performance:

### Running Benchmarks

```bash
# Build and run benchmarks
bun run build
bun dist/bench_models.mjs
```

### Benchmark Features

- **Multi-Model Testing**: Compare Groq, Gemini, Ollama, Mistral, and OpenRouter models
- **Performance Metrics**: Response time, success rate, and output quality
- **Standardized Prompts**: Consistent test cases across all models
- **JSON Reports**: Detailed results saved to `benchmark-results/` directory

### Available Models

- `openai/gpt-oss-120b` (Groq)
- `gemini-2.0-flash-lite` (Google)
- `devstral-small-2505` (Mistral)
- `qwen2.5-coder:1.5b` (Ollama)
- `or-devstral` (OpenRouter)

## CI Evaluations

LazyShell includes automated quality assessments that run in CI to ensure consistent performance:

### Overview

- **Path-filtered and weekly**: Runs on `src/lib/**` changes plus a Monday schedule
- **Pinned generator**: Groq `openai/gpt-oss-120b` unless overridden
- **Cross-provider judge**: Google, OpenAI, or Anthropic when those keys exist
- **Gates**: CommandSafety, per-case Correctness, 80% overall, and baseline regression

### Quick Setup

1. Add `GROQ_API_KEY` (and optionally a judge key) to repository secrets
2. Fork PRs skip evals instead of failing when secrets are missing
3. The job fails if scores drop below the gates or more than 10 points below `eval-results/ci-baseline.json`

### Local Testing

```bash
# Run CI evaluations locally
bun run eval:ci

# Write a new committed baseline after a reviewed change
bun run eval:ci:baseline

# Evaluate the bundled local model (downloads GGUF on first run)
bun run eval:bundled
```

### Custom Evaluation Scripts

```bash
bun run eval:basic
bun run eval:example
bun src/lib/bundled.eval.ts
```

See [docs/CI_EVALUATIONS.md](docs/CI_EVALUATIONS.md) for complete setup and configuration guide.

## Development

### Prerequisites

- Bun (recommended)

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/bernoussama/lazyshell.git
   cd lazyshell
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Build the project:

   ```bash
   bun run build
   ```

4. Link the package for local development:

   ```bash
   bun link --global
   ```

### Available Scripts

```bash
bun x                    # Quick run with jiti (development)
bun run build           # Compile TypeScript with pkgroll
bun run typecheck       # Type checking only
bun run lint            # Check code formatting and linting
bun run lint:fix        # Fix formatting and linting issues
bun run eval:ci         # Run CI evaluations locally
bun run eval:ci:baseline # Update eval-results/ci-baseline.json
bun run eval:basic      # Run the shared dataset locally
bun run eval:bundled    # Evaluate the bundled local model
bun run release:patch   # Build, version bump, publish, and push
bun run prerelease      # Build, prerelease version, publish, and push
```

### Project Structure

```
src/
├── index.ts              # Main CLI entry point
├── utils.ts              # Utility functions (command execution, history)
├── bench_models.ts       # Model benchmarking script
├── commands/
│   ├── config.ts         # Configuration UI command
│   └── model.ts          # Bundled model install/remove
├── helpers/
│   ├── index.ts          # Helper exports
│   └── package-manager.ts # System package manager detection
└── lib/
    ├── ai.ts             # AI provider integrations and command generation
    ├── local-models.ts   # Ollama/LM Studio catalog and bundled GGUF pin
    ├── bundled-model.ts  # Bundled download, checksum, llama-server
    ├── config.ts         # Configuration management
    ├── eval.ts           # Evaluation framework
    ├── eval-cases.ts     # Shared command-generation cases
    ├── prompt-examples.ts # Compact-prompt few-shots
    ├── basic.eval.ts     # Local evaluation runner
    ├── ci-eval.ts        # CI evaluation script
    ├── bundled.eval.ts   # Bundled-model evaluation
    └── example.eval.ts   # Example evaluation scenarios
```

### Development Features

- **TypeScript**: Full type safety and modern JavaScript features
- **pkgroll**: Modern bundling with tree-shaking
- **jiti**: Fast development with TypeScript execution
- **Watch Mode**: Auto-compilation during development
- **Modular Architecture**: Clean separation of concerns
- **ESM**: Modern ES modules throughout

## Troubleshooting

### Configuration Issues

- **Invalid configuration**: Delete `~/.lazyshell/config.json` to reset or use `lazyshell config`
- **API key errors**: Run `lazyshell config` to re-enter your API key
- **Provider not working**: Try switching to a different provider in the configuration

### Environment Variables

LazyShell will automatically fall back to environment variables if the config file is invalid or incomplete.

### Common Issues

- **Clipboard not working**: Ensure your system supports clipboard operations
- **Model timeout**: Some models (especially Ollama or the first bundled-model start) may take longer to respond
- **Bundled model missing**: Run `lazyshell model install` or pick Ollama/LM Studio/cloud in `lazyshell config`
- **Rate limiting**: Built-in retry logic handles temporary rate limits
- **Command not found**: Make sure the package is properly installed globally

### Debug Mode

For troubleshooting, you can check:

- Configuration file: `~/.lazyshell/config.json`
- System detection: The AI considers your OS, distro, and package manager
- Command history: Generated commands are added to your shell history

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Guidelines

- Follow TypeScript best practices
- Add tests for new features
- Update documentation as needed
- Run evaluations before submitting PRs
- Use the KISS principle (Keep It Simple Stupid)
- Follow GitHub flow (create feature branches)

## License 📄

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Commander.js](https://github.com/tj/commander.js/)
- Interactive prompts powered by [@clack/prompts](https://github.com/natemoo-re/clack)
- Clipboard integration via [@napi-rs/clipboard](https://github.com/napi-rs/node-rs)
- AI SDK integration with [Vercel AI SDK](https://github.com/vercel/ai)
- Bundled with [pkgroll](https://github.com/privatenumber/pkgroll)
- Powered by AI models from multiple providers
- Inspired by the need to be lazy (in a good way!)
