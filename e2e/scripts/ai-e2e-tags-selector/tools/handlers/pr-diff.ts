/**
 * PR Diff Tool Handler
 *
 * Handles getting PR diffs from GitHub
 */

import { ToolInput } from '../../types';
import { getPRDiff, validatePRNumber } from '../../utils/git-utils';

export function handlePRDiff(input: ToolInput, githubRepo: string): string {
  const prNumber = validatePRNumber(input.pr_number);
  const files = (input.files as string[]) || [];

  if (!prNumber) {
    return `Invalid PR number: ${input.pr_number}. Must be a positive integer.`;
  }

  return getPRDiff(prNumber, githubRepo, files);
}
