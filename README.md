# LazyShell 🐚

> A smart CLI tool that generates and executes shell commands using AI

LazyShell is a command-line interface that helps you quickly generate and execute shell commands using AI. It supports multiple AI providers and provides an interactive configuration system for easy setup.

## Features ✨

- 🔍 Generates shell commands from natural language descriptions
- ⚡ Supports multiple AI providers (Groq, Google Gemini, OpenRouter, Anthropic, OpenAI, Ollama)
- 🔧 Interactive configuration system - no manual environment setup needed
- 🔒 Safe execution with confirmation prompt
- 🚀 Fast and lightweight
- 🔄 Automatic fallback to environment variables
- 💾 Persistent configuration storage

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

3. **Automatic Configuration**: Your preferences are saved to `~/.lazyshell/config.json` and used for future runs.

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

### Running Tests
```bash
pnpm test
```

## Troubleshooting 🔧

### Configuration Issues
- **Invalid configuration**: Delete `~/.lazyshell/config.json` to reset
- **API key errors**: Run LazyShell again to re-enter your API key
- **Provider not working**: Try switching to a different provider in the configuration

### Environment Variables
LazyShell will automatically fall back to environment variables if the config file is invalid or incomplete.

## Contributing 🤝

Contributions are welcome! Please feel free to submit a Pull Request.

## License 📄

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Commander.js](https://github.com/tj/commander.js/)
- Interactive prompts powered by [@inquirer/prompts](https://github.com/SBoudrias/Inquirer.js)
- Powered by AI models from multiple providers
- Inspired by the need to be lazy (in a good way!)
