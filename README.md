# LazyShell 🐚

> A smart CLI tool that generates and executes shell commands using AI

LazyShell is a command-line interface that helps you quickly generate and execute shell commands using AI. It supports multiple AI providers including Google's Gemini and Groq's Llama models.

## Features ✨

- 🔍 Generates shell commands from natural language descriptions
- ⚡ Supports multiple AI providers (Google Gemini, Groq)
- 🔒 Safe execution with confirmation prompt
- 🚀 Fast and lightweight
- 🔄 Automatically detects available AI API keys

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

## Prerequisites 🔑

You'll need an API key from one of the supported AI providers:

1. **Google Gemini**: Set `GOOGLE_GENERATIVE_AI_API_KEY`
2. **Groq**: Set `GROQ_API_KEY`

Add your API key to your environment variables or `.env` file:

```bash
export GROQ_API_KEY='your-api-key-here'
# OR
export GOOGLE_GENERATIVE_AI_API_KEY='your-api-key-here'
```

## Tested Models 🤖

LazyShell has been tested with the following AI models:

### Google AI Models
- `gemini-2.0-flash-lite` (Default when `GOOGLE_GENERATIVE_AI_API_KEY` is set)
  - Fast and efficient model for quick command generation
  - Good balance of speed and accuracy

### Groq Models
- `llama-3.1-8b-instant` (Default when `GROQ_API_KEY` is set)
  - Powerful open-weight model from Meta
  - Excellent at understanding natural language prompts
  - Provides accurate command suggestions

> Note: The tool will automatically select the appropriate model based on the available API key. Google's Gemini is used by default if both API keys are present.

## Usage 🚀

### Basic Usage

```bash
lazyshell "your natural language command description"
```

### Auto-confirm (skip confirmation prompt)

```bash
lazyshell -y "your command"
# or
lazyshell --yes "your command"
```

### Examples

```bash
# Find all .js files modified in the last 7 days
lazyshell "find all JavaScript files modified in the last 7 days"

# Check disk usage
lazyshell "show disk usage sorted by size"

# Search for a process
lazyshell "find all running node processes"
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

## Contributing 🤝

Contributions are welcome! Please feel free to submit a Pull Request.

## License 📄

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Commander.js](https://github.com/tj/commander.js/)
- Powered by AI models from Google and Groq
- Inspired by the need to be lazy (in a good way!)
