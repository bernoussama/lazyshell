import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  command: string;
}

export async function executeCommand(command: string): Promise<CommandResult> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout: 30000, // 30 second timeout
      maxBuffer: 1024 * 1024 // 1MB buffer
    });
    
    // Add to shell history
    addToShellHistory(command);
    
    return {
      success: true,
      stdout: stdout.toString(),
      stderr: stderr.toString(),
      exitCode: 0,
      command
    };
  } catch (error: any) {
    // Add to shell history even if failed
    addToShellHistory(command);
    
    return {
      success: false,
      stdout: error.stdout?.toString() || '',
      stderr: error.stderr?.toString() || error.message,
      exitCode: error.code || 1,
      command
    };
  }
}

function addToShellHistory(command: string): void {
  try {
    const shell = process.env.SHELL?.split('/').pop() || '';
    let historyFilePath = '';

    if (shell === 'zsh') {
      historyFilePath = path.join(os.homedir(), '.zsh_history');
      fs.appendFileSync(historyFilePath, `: ${Math.floor(Date.now() / 1000)}:0;${command}\n`);
    } else if (shell === 'bash') {
      historyFilePath = path.join(os.homedir(), '.bash_history');
      fs.appendFileSync(historyFilePath, `${command}\n`);
    } else {
      historyFilePath = path.join(os.homedir(), '.sh_history');
      fs.appendFileSync(historyFilePath, `${command}\n`);
    }
  } catch {
    // Silently fail if we can't add to history
  }
}

export function runCommand(command: string) {
  console.log('');

  const childProcess = exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return;
    }

    if (stderr) {
      console.error(`stderr: ${stderr}`);
    }
  });

  // Add to shell history
  addToShellHistory(command);

  // Handle process output in real-time
  childProcess.stdout?.on('data', data => {
    process.stdout.write(data);
  });

  childProcess.stderr?.on('data', data => {
    process.stderr.write(data);
  });
}
