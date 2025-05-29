import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { stream } from '@clack/prompts';

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

    // console.log(`stdout: ${stdout}`);
  });

  // Determine user shell and add command to appropriate history file
  const shell = process.env.SHELL?.split('/').pop() || '';
  let historyFilePath = '';

  if (shell === 'zsh') {
    historyFilePath = path.join(os.homedir(), '.zsh_history');
    // ZSH history format includes timestamps
    fs.appendFileSync(historyFilePath, `: ${Math.floor(Date.now() / 1000)}:0;${command}\n`);
  } else if (shell === 'bash') {
    historyFilePath = path.join(os.homedir(), '.bash_history');
    fs.appendFileSync(historyFilePath, `${command}\n`);
  } else {
    // Default to sh history format
    historyFilePath = path.join(os.homedir(), '.sh_history');
    fs.appendFileSync(historyFilePath, `${command}\n`);
  }

  // Handle process output in real-time
  childProcess.stdout?.on('data', data => {
    process.stdout.write(data);
  });

  childProcess.stderr?.on('data', data => {
    process.stderr.write(data);
  });
}

export async function print(msg: string){
          await stream.message(
            (function* () {
              yield `${msg}`;
            })()
          );
}

export async function info(msg: string){
          await stream.info(
            (function* () {
              yield `${msg}`;
            })()
          );
}