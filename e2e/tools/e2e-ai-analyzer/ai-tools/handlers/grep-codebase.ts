/**
 * Grep Codebase Tool Handler
 *
 * Searches for patterns across the codebase
 */

import { execSync } from 'node:child_process';
import { ToolInput } from '../../types';
import { TOOL_LIMITS } from '../../config';

/**
 * Escapes shell special characters to prevent command injection
 */
function escapeShell(str: string): string {
  return str.replace(/[`$\\"\n]/g, '\\$&');
}

export function handleGrepCodebase(input: ToolInput, baseDir: string): string {
  const pattern = escapeShell(input.pattern as string);
  const filePattern = escapeShell((input.file_pattern as string) || '*');
  const maxResults =
    (input.max_results as number) || TOOL_LIMITS.grepMaxResults;

  if (!pattern) {
    return 'Error: pattern is required';
  }

  try {
    // Use grep with common source code file extensions
    // -r: recursive, -n: line numbers, -i: case insensitive, --include: file pattern
    const command = `grep -rni --include="${filePattern}" "${pattern}" app/ | head -${maxResults}`;

    const result = execSync(command, {
      encoding: 'utf-8',
      cwd: baseDir,
      maxBuffer: 1024 * 1024 * 5, // 5MB buffer
    });

    if (!result.trim()) {
      return `No matches found for pattern: "${pattern}" in files: ${filePattern}`;
    }

    const lines = result.trim().split('\n');
    const resultCount = lines.length;

    return `Found ${resultCount} matches for "${pattern}" (showing up to ${maxResults}):\n\n${result}`;
  } catch (error: unknown) {
    // grep returns exit code 1 when no matches found
    if (
      error &&
      typeof error === 'object' &&
      'status' in error &&
      error.status === 1
    ) {
      return `No matches found for pattern: "${pattern}" in files: ${filePattern}`;
    }

    return `Error searching for pattern "${pattern}": ${
      error instanceof Error ? error.message : String(error)
    }`;
  }
}
