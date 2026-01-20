/**
 * Grep Codebase Tool Handler
 *
 * Searches for patterns across the codebase
 */

import { execSync } from 'node:child_process';
import { ToolInput } from '../../types';
import { TOOL_LIMITS } from '../../config';

/**
 * Validates and sanitizes grep pattern
 * Rejects dangerous patterns, allows safe grep regex
 */
function sanitizeGrepPattern(str: string): string {
  // Reject patterns with command substitution or command chaining
  if (str.includes('`') || str.includes('$(') || str.includes('\n')) {
    throw new Error('Invalid pattern: contains dangerous characters');
  }

  // Escape shell metacharacters that could cause issues
  // Escapes: $, ", \ (shell interpretation)
  // Preserves: |, *, ., [], {}, +, ? (grep regex)
  return str.replace(/[$"\\]/g, '\\$&');
}

export function handleGrepCodebase(input: ToolInput, baseDir: string): string {
  const rawPattern = input.pattern as string;
  const rawFilePattern = (input.file_pattern as string) || '*';
  const maxResults =
    (input.max_results as number) || TOOL_LIMITS.grepMaxResults;

  if (!rawPattern) {
    return 'Error: pattern is required';
  }

  try {
    const pattern = sanitizeGrepPattern(rawPattern);
    const filePattern = sanitizeGrepPattern(rawFilePattern);

    // Use grep -E for extended regex (supports |, +, ?, etc.)
    // -E: extended regex, -r: recursive, -n: line numbers, -i: case insensitive
    const command = `grep -Erni --include="${filePattern}" --exclude-dir=node_modules "${pattern}" app/ e2e/ .github/ scripts/ appwright/ 2>/dev/null | head -${maxResults}`;

    const result = execSync(command, {
      encoding: 'utf-8',
      cwd: baseDir,
      maxBuffer: 1024 * 1024 * 5, // 5MB buffer
    });

    if (!result.trim()) {
      return `No matches found for pattern: "${rawPattern}" in files: ${rawFilePattern}`;
    }

    const lines = result.trim().split('\n');
    const resultCount = lines.length;

    return `Found ${resultCount} matches for "${rawPattern}" (showing up to ${maxResults}):\n\n${result}`;
  } catch (error: unknown) {
    // Check if it's a validation error
    if (error instanceof Error && error.message.includes('Invalid pattern')) {
      return `Invalid pattern: ${error.message}`;
    }

    // grep returns exit code 1 when no matches found
    if (
      error &&
      typeof error === 'object' &&
      'status' in error &&
      error.status === 1
    ) {
      return `No matches found for pattern: "${rawPattern}" in files: ${rawFilePattern}`;
    }

    return `Error searching for pattern "${rawPattern}": ${
      error instanceof Error ? error.message : String(error)
    }`;
  }
}
