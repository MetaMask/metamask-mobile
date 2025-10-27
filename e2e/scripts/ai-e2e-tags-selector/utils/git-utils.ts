/**
 * Git Utilities
 *
 * Functions for interacting with git to get file changes and diffs
 */

import { execSync } from 'child_process';

/**
 * Gets the list of changed files between a base branch and HEAD
 */
export function getChangedFiles(
  baseBranch: string,
  includeMainChanges: boolean,
  baseDir: string
): string[] {
  try {
    const targetBranch = baseBranch || 'origin/main';
    const syntax = includeMainChanges ? '..' : '...';

    const changedFiles = execSync(
      `git diff --name-only ${targetBranch}${syntax}HEAD`,
      {
        encoding: 'utf8',
        cwd: baseDir,
        stdio: ['ignore', 'pipe', 'ignore']
      }
    )
      .trim()
      .split('\n')
      .filter(f => f);

    return changedFiles;
  } catch {
    return [];
  }
}

/**
 * Gets the diff for a specific file
 */
export function getFileDiff(
  filePath: string,
  baseBranch: string,
  includeMainChanges: boolean,
  baseDir: string,
  linesLimit = 1000
): string {
  try {
    const targetBranch = baseBranch || 'origin/main';
    const syntax = includeMainChanges ? '..' : '...';

    const diff = execSync(
      `git diff ${targetBranch}${syntax}HEAD -- "${filePath}"`,
      {
        encoding: 'utf-8',
        cwd: baseDir
      }
    );

    if (!diff) {
      return `No git diff available for ${filePath} (may be new/untracked)`;
    }

    const lines = diff.split('\n');
    if (lines.length > linesLimit) {
      return `Diff for ${filePath} (truncated to ${linesLimit} lines):\n${lines
        .slice(0, linesLimit)
        .join('\n')}`;
    }

    return `Diff for ${filePath}:\n${diff}`;
  } catch {
    return `Could not get git diff for ${filePath}`;
  }
}

/**
 * Gets PR diff using GitHub CLI
 */
export function getPRDiff(
  prNumber: number,
  files?: string[],
  linesLimit = 2000
): string {
  try {
    const diff = execSync(
      `gh pr diff ${prNumber} --repo metamask/metamask-mobile`,
      { encoding: 'utf-8' }
    );

    if (files && files.length > 0) {
      return filterDiffByFiles(diff, files);
    }

    const lines = diff.split('\n');
    if (lines.length > linesLimit) {
      return `PR #${prNumber} diff (truncated to ${linesLimit} lines):\n${lines
        .slice(0, linesLimit)
        .join('\n')}`;
    }

    return `PR #${prNumber} diff:\n${diff}`;
  } catch {
    return `Could not fetch diff for PR #${prNumber}. Ensure gh CLI is authenticated.`;
  }
}

/**
 * Gets files changed in a PR using GitHub CLI
 */
export function getPRFiles(prNumber: number): string[] {
  try {
    const files = execSync(
      `gh pr view ${prNumber} --json files --jq '.files[].path'`,
      { encoding: 'utf-8' }
    )
      .trim()
      .split('\n')
      .filter(f => f);

    return files;
  } catch (error) {
    console.error(
      `❌ Failed to fetch files for PR #${prNumber}. Ensure gh CLI is authenticated.`
    );
    return [];
  }
}

/**
 * Filters diff output to only include specified files
 */
function filterDiffByFiles(diff: string, files: string[]): string {
  const fileDiffs: string[] = [];
  const sections = diff.split('diff --git');

  for (const section of sections) {
    if (!section.trim()) continue;

    for (const file of files) {
      if (section.includes(file)) {
        fileDiffs.push('diff --git' + section);
        break;
      }
    }
  }

  return fileDiffs.join('\n\n') || 'No diffs found for specified files';
}
