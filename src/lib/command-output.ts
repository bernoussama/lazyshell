const FENCE_RE = /```(?:bash|sh|zsh|shell|powershell)?\s*\n?([\s\S]*?)```/i;

export function extractCommand(raw: string): string {
  let text = raw.trim();
  if (!text) {
    return text;
  }

  const fenced = text.match(FENCE_RE);
  if (fenced?.[1]) {
    text = fenced[1].trim();
  }

  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#') && !line.startsWith('```'));

  const commandLine =
    lines.find(line => looksLikeCommand(line)) ?? lines.find(line => !looksLikeProse(line)) ?? lines[0] ?? text;

  return stripWrappers(commandLine);
}

export function usesCompactPrompt(provider?: string, modelId?: string): boolean {
  if (provider === 'bundled') {
    return true;
  }
  const id = (modelId ?? '').toLowerCase();
  return id.includes('0.5b') || id.includes('0.8b') || id.includes('nl2sh') || id.includes('nl2shell');
}

function looksLikeCommand(line: string): boolean {
  const stripped = stripWrappers(line);
  return /^(sudo\s+)?(\.\/|[a-zA-Z][\w.-]*|[.~]\/)/.test(stripped) && !looksLikeProse(stripped);
}

function looksLikeProse(line: string): boolean {
  return /^(this|the|to |here|you |use |try |command:)/i.test(line) || line.endsWith(':') || line.endsWith('.');
}

function stripWrappers(line: string): string {
  let value = line.replace(/^Command:\s*/i, '').trim();
  if ((value.startsWith('`') && value.endsWith('`')) || (value.startsWith('"') && value.endsWith('"'))) {
    value = value.slice(1, -1).trim();
  }
  return value;
}
