import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { stream } from '@clack/prompts';
import { wrapText } from './helpers/text-wrapper';

export function runCommand(command: string): Promise<number> {
  console.log('');

  appendToShellHistory(command);

  const shell = process.env.SHELL || (os.platform() === 'win32' ? 'powershell' : '/bin/sh');
  const childProcess = spawn(shell, ['-c', command], {
    stdio: 'inherit',
  });

  return new Promise((resolve, reject) => {
    childProcess.on('close', code => {
      resolve(code ?? 0);
    });
    childProcess.on('error', err => {
      reject(err);
    });
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
