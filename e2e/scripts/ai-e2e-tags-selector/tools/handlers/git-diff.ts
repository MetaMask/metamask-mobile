/**
 * Git Diff Tool Handler
 *
 * Handles getting git diffs for files
 */

import { ToolInput } from '../../types';
import { getFileDiff } from '../../utils/git-utils';

export function handleGitDiff(
  input: ToolInput,
  baseDir: string,
  baseBranch: string,
  includeMainChanges: boolean
): string {
  const filePath = input.file_path as string;
  const linesLimit = (input.lines_limit as number) || 1000;

  return getFileDiff(filePath, baseBranch, includeMainChanges, baseDir, linesLimit);
}
