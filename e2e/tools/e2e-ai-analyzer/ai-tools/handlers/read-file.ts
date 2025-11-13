/**
 * Read File Tool Handler
 *
 * Handles reading file contents
 */

import { join, normalize } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { ToolInput } from '../../types';
import { TOOL_LIMITS } from '../../config';

export function handleReadFile(input: ToolInput, baseDir: string): string {
  const filePath = normalize(input.file_path as string);
  const linesLimit =
    (input.lines_limit as number) || TOOL_LIMITS.readFileMaxLines;

  // Prevent path traversal
  if (filePath.includes('..')) {
    return `Invalid file path: ${filePath}`;
  }

  const fullPath = join(baseDir, filePath);

  if (!existsSync(fullPath)) {
    return `File not found: ${filePath}`;
  }

  const content = readFileSync(fullPath, 'utf-8');
  const lines = content.split('\n');

  if (lines.length > linesLimit) {
    return `${filePath} (${
      lines.length
    } lines, showing first ${linesLimit}):\n\n${lines
      .slice(0, linesLimit)
      .join('\n')}`;
  }

  return `${filePath} (${lines.length} lines):\n\n${content}`;
}
