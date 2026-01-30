/**
 * Git Diff Tool Handler
 *
 * Handles getting git diffs for files.
 * Uses PR diff via GitHub CLI when PR context is available,
 * falls back to local git diff otherwise.
 */

import { normalize } from 'node:path';
import { ToolInput } from '../../types';
import { getFileDiff, getPRFileDiff } from '../../utils/git-utils';
import { TOOL_LIMITS } from '../../config';
import { ToolContext } from '../tool-executor';

export function handleGitDiff(input: ToolInput, context: ToolContext): string {
  const filePath = normalize(input.file_path as string);
  const linesLimit =
    (input.lines_limit as number) || TOOL_LIMITS.gitDiffMaxLines;

  // Prevent path traversal
  if (filePath.includes('..')) {
    return `Invalid file path: ${filePath}`;
  }

  // Use PR diff when PR context is available (more reliable for PR analysis)
  if (context.prNumber && context.githubRepo) {
    return getPRFileDiff(
      context.prNumber,
      context.githubRepo,
      filePath,
      linesLimit,
    );
  }

  // Fall back to local git diff
  return getFileDiff(filePath, context.baseBranch, context.baseDir, linesLimit);
}
