/**
 * Git Diff Tool Handler
 *
 * Handles getting git diffs for files
 */

import { normalize } from 'node:path';
import { ToolInput } from '../../types';
import { getFileDiff } from '../../utils/git-utils';
import { TOOL_LIMITS } from '../../config';

export function handleGitDiff(
  input: ToolInput,
  baseDir: string,
  baseBranch: string,
): string {
  const filePath = normalize(input.file_path as string);
  const linesLimit =
    (input.lines_limit as number) || TOOL_LIMITS.gitDiffMaxLines;

  // Prevent path traversal
  if (filePath.includes('..')) {
    return `Invalid file path: ${filePath}`;
  }

  return getFileDiff(filePath, baseBranch, baseDir, linesLimit);
}
