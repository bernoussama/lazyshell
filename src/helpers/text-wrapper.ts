/**
 * Wraps text to specified line width
 * @param text - The text to wrap
 * @param maxWidth - Maximum characters per line (default: 80)
 * @returns Wrapped text with line breaks
 */
export function wrapText(text: string, maxWidth: number = 80): string {
  if (!text || maxWidth <= 0) {
    return text;
  }

  // Split text into words
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    // If adding this word would exceed the line width
    if (currentLine.length + word.length + 1 > maxWidth) {
      // If current line is not empty, push it and start a new line
      if (currentLine.length > 0) {
        lines.push(currentLine.trim());
        currentLine = word;
      } else {
        // If the word itself is longer than maxWidth, just add it
        lines.push(word);
        currentLine = '';
      }
    } else {
      // Add word to current line
      if (currentLine.length > 0) {
        currentLine += ' ' + word;
      } else {
        currentLine = word;
      }
    }
  }

  // Add the last line if it's not empty
  if (currentLine.length > 0) {
    lines.push(currentLine.trim());
  }

  return lines.join('\n');
}

/**
 * Wraps text with a prefix for each line (useful for indentation)
 * @param text - The text to wrap
 * @param maxWidth - Maximum characters per line
 * @param prefix - Prefix to add to each line
 * @returns Wrapped text with prefix on each line
 */
export function wrapTextWithPrefix(text: string, maxWidth: number = 80, prefix: string = ''): string {
  const wrappedText = wrapText(text, maxWidth - prefix.length);
  return wrappedText
    .split('\n')
    .map(line => prefix + line)
    .join('\n');
} 