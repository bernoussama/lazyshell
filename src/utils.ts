import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { stream } from '@clack/prompts';
import { wrapText } from './helpers/text-wrapper';

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

  appendToShellHistory(command);

  childProcess.stdout?.on('data', data => {
    process.stdout.write(data);
  });

  childProcess.stderr?.on('data', data => {
    process.stderr.write(data);
  });
}

function appendToShellHistory(command: string) {
  const shell = process.env.SHELL?.split('/').pop() || '';
  let historyFilePath: string;
  let entry: string;

  if (shell === 'zsh') {
    historyFilePath = path.join(os.homedir(), '.zsh_history');
    entry = `: ${Math.floor(Date.now() / 1000)}:0;${command}\n`;
  } else if (shell === 'bash') {
    historyFilePath = path.join(os.homedir(), '.bash_history');
    entry = `${command}\n`;
  } else {
    historyFilePath = path.join(os.homedir(), '.sh_history');
    entry = `${command}\n`;
  }

  fs.appendFileSync(historyFilePath, entry);
}

export async function print(msg: string) {
  await stream.message(
    (function* () {
      yield msg;
    })()
  );
}

export async function printWrapped(msg: string, lineWidth: number = 80) {
  const wrappedMsg = wrapText(msg, lineWidth);
  await stream.message(
    (function* () {
      yield wrappedMsg;
    })()
  );
}

export async function info(msg: string) {
  await stream.info(
    (function* () {
      yield msg;
    })()
  );
}
