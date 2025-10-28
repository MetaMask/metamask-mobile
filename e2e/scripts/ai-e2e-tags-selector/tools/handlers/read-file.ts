/**
 * Read File Tool Handler
 *
 * Handles reading file contents
 */

import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import { ToolInput } from '../../types';

export function handleReadFile(input: ToolInput, baseDir: string): string {
  const filePath = input.file_path as string;
  const linesLimit = (input.lines_limit as number) || 2000;
  const fullPath = join(baseDir, filePath);

  if (!existsSync(fullPath)) {
    return `File not found: ${filePath}`;
  }

  const content = readFileSync(fullPath, 'utf-8');
  const lines = content.split('\n');

  if (lines.length > linesLimit) {
    return `${filePath} (${lines.length} lines, showing first ${linesLimit}):\n\n${lines
      .slice(0, linesLimit)
      .join('\n')}`;
  }

  return `${filePath} (${lines.length} lines):\n\n${content}`;
}
