export interface CompactPromptExample {
  user: string;
  command: string;
}

export const COMPACT_PROMPT_EXAMPLES: CompactPromptExample[] = [
  { user: 'print the working directory', command: 'pwd' },
  { user: 'show OS and kernel information', command: 'uname -a' },
  { user: 'list all files including hidden ones in long format', command: 'ls -la' },
  { user: 'create a folder named demo', command: 'mkdir demo' },
  { user: 'find javascript files recursively', command: "find . -type f -name '*.js'" },
  { user: 'check disk usage', command: 'df -h' },
];

export function formatCompactPromptExamples(): string {
  return COMPACT_PROMPT_EXAMPLES.map(example => `User: ${example.user}\n${example.command}`).join('\n');
}
