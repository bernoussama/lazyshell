import chalk from 'chalk';
import { generateAgentCommand, AgentCommand, getModelFromConfig, ModelConfig } from './ai';
import { executeCommand, CommandResult } from '../utils';
import { Config } from './config';
import { text, confirm, isCancel } from '@clack/prompts';

export interface AgentOptions {
  maxRetries?: number;
  interactive?: boolean;
  safetyMode?: boolean;
}

export interface AgentResult {
  success: boolean;
  finalCommand?: string;
  results: CommandResult[];
  iterations: number;
  aborted?: boolean;
  reason?: string;
}

export class CommandAgent {
  private config: Config;
  private modelConfig: ModelConfig;
  private options: Required<AgentOptions>;

  constructor(config: Config, options: AgentOptions = {}) {
    this.config = config;
    this.modelConfig = getModelFromConfig(config);
    this.options = {
      maxRetries: options.maxRetries ?? 3,
      interactive: options.interactive ?? true,
      safetyMode: options.safetyMode ?? true,
    };
  }

  async executeTask(prompt: string): Promise<AgentResult> {
    console.log(chalk.blue('🤖 Agent mode activated'));
    console.log(chalk.gray(`Task: ${prompt}`));
    console.log(chalk.gray(`Max retries: ${this.options.maxRetries}`));
    console.log(chalk.gray(`Safety mode: ${this.options.safetyMode ? 'ON' : 'OFF'}\n`));

    const results: CommandResult[] = [];
    let iterations = 0;
    let currentPrompt = prompt;

    while (iterations < this.options.maxRetries) {
      iterations++;
      console.log(chalk.yellow(`\n📝 Iteration ${iterations}/${this.options.maxRetries}`));

      try {
        // Generate command with safety assessment
        console.log(chalk.gray('Generating command...'));
        const agentCommand = await generateAgentCommand(currentPrompt, this.modelConfig);
        
        console.log(chalk.blue(`Command: ${agentCommand.command}`));
        console.log(chalk.gray(`Explanation: ${agentCommand.explanation}`));
        console.log(chalk.gray(`Safety: ${agentCommand.safe ? '✅ SAFE' : '⚠️  UNSAFE'}`));
        console.log(chalk.gray(`Reasoning: ${agentCommand.reasoning}`));

        // Safety check
        if (this.options.safetyMode && !agentCommand.safe) {
          console.log(chalk.red('\n🛑 Command marked as unsafe in safety mode'));
          
          if (this.options.interactive) {
            const proceed = await confirm({
              message: 'Do you want to execute this potentially unsafe command?',
            });
            
            if (isCancel(proceed) || !proceed) {
              return {
                success: false,
                results,
                iterations,
                aborted: true,
                reason: 'User aborted unsafe command execution'
              };
            }
          } else {
            return {
              success: false,
              results,
              iterations,
              aborted: true,
              reason: 'Unsafe command blocked by safety mode'
            };
          }
        }

        // Interactive confirmation if enabled
        if (this.options.interactive && agentCommand.safe) {
          const proceed = await confirm({
            message: 'Execute this command?',
          });
          
          if (isCancel(proceed) || !proceed) {
            return {
              success: false,
              results,
              iterations,
              aborted: true,
              reason: 'User cancelled execution'
            };
          }
        }

        // Execute the command
        console.log(chalk.green('\n⚡ Executing command...'));
        const result = await executeCommand(agentCommand.command);
        results.push(result);

        // Display results
        if (result.success) {
          console.log(chalk.green('✅ Command executed successfully'));
          if (result.stdout) {
            console.log(chalk.white('Output:'));
            console.log(result.stdout);
          }
          
          return {
            success: true,
            finalCommand: agentCommand.command,
            results,
            iterations
          };
        } else {
          console.log(chalk.red('❌ Command failed'));
          console.log(chalk.red(`Exit code: ${result.exitCode}`));
          if (result.stderr) {
            console.log(chalk.red('Error:'));
            console.log(result.stderr);
          }
          if (result.stdout) {
            console.log(chalk.yellow('Output:'));
            console.log(result.stdout);
          }

          // If we have more retries, ask agent to fix the command
          if (iterations < this.options.maxRetries) {
            console.log(chalk.yellow(`\n🔄 Attempting to fix command (${this.options.maxRetries - iterations} retries left)...`));
            
            // Update prompt with error context for next iteration
            currentPrompt = this.buildRetryPrompt(prompt, agentCommand, result);
          }
        }

      } catch (error) {
        console.error(chalk.red('❌ Error during agent execution:'), error);
        results.push({
          success: false,
          stdout: '',
          stderr: error instanceof Error ? error.message : String(error),
          exitCode: 1,
          command: 'GENERATION_FAILED'
        });
      }
    }

    return {
      success: false,
      results,
      iterations,
      reason: `Maximum retries (${this.options.maxRetries}) exceeded`
    };
  }

  private buildRetryPrompt(originalPrompt: string, failedCommand: AgentCommand, result: CommandResult): string {
    return `${originalPrompt}

PREVIOUS ATTEMPT FAILED:
Command: ${failedCommand.command}
Exit Code: ${result.exitCode}
Error Output: ${result.stderr}
Standard Output: ${result.stdout}

Please analyze the error and provide a corrected command. Consider:
1. What went wrong with the previous command?
2. Are there missing dependencies or prerequisites?
3. Is the syntax correct for the current system?
4. Are there permission issues?
5. Do we need a different approach?

Generate a fixed command that addresses the specific error encountered.`;
  }

  async askForContext(question: string): Promise<string | null> {
    if (!this.options.interactive) {
      return null;
    }

    console.log(chalk.yellow(`\n🤔 Agent needs more information:`));
    console.log(chalk.white(question));

    const response = await text({
      message: 'Please provide additional context:',
      placeholder: 'Enter additional information or "skip" to continue without it',
    });

    if (isCancel(response)) {
      return null;
    }

    return response === 'skip' ? null : response;
  }
}

// Convenience function for quick agent execution
export async function runAgentCommand(
  prompt: string, 
  config: Config, 
  options?: AgentOptions
): Promise<AgentResult> {
  const agent = new CommandAgent(config, options);
  return agent.executeTask(prompt);
}
