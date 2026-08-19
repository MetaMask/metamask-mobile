/**
 * Git Utilities
 *
 * Functions for interacting with git to get file changes and diffs
 */

import { execSync } from 'node:child_process';

/**
 * Validates a commit SHA to prevent command injection.
 * Only allows hex characters (0-9, a-f) which are valid for git SHAs.
 */
function validateCommitSha(sha: string): string {
  if (!/^[0-9a-f]+$/i.test(sha)) {
    throw new Error(`Invalid commit SHA: ${sha}`);
  }
  return sha;
}

/**
 * Gets the list of changed files between a base branch and HEAD
 * Uses three-dot syntax (...) to compare against merge base
 */
export function getAllChangedFiles(
  baseBranch: string,
  baseDir: string,
): string[] {
  try {
    const targetBranch = baseBranch;

    const changedFiles = execSync(
      `git diff --name-only ${targetBranch}...HEAD`,
      {
        encoding: 'utf8',
        cwd: baseDir,
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    )
      .trim()
      .split('\n')
      .filter((f) => f);

    return changedFiles;
  } catch {
    return [];
  }
}

/**
 * Gets the diff for a specific file
 * Uses three-dot syntax (...) to compare against merge base
 */
/**
 * Escapes shell special characters to prevent command injection
 */
function escapeShell(str: string): string {
  return str.replace(/[`$\\"\n]/g, '\\$&');
}

export function getFileDiff(
  filePath: string,
  baseBranch: string,
  baseDir: string,
  linesLimit = 1000,
): string {
  try {
    const targetBranch = escapeShell(baseBranch);
    const escapedFilePath = escapeShell(filePath);

    const diff = execSync(
      `git diff ${targetBranch}...HEAD -- "${escapedFilePath}"`,
      {
        encoding: 'utf-8',
        cwd: baseDir,
      },
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
  repo: string,
  files?: string[],
  linesLimit = 2000,
): string {
  try {
    const diff = execSync(`gh pr diff ${prNumber} --repo ${repo}`, {
      encoding: 'utf-8',
    });

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
 * Gets diff for a specific file from a PR using GitHub CLI
 * More reliable than local git diff when analyzing PRs
 */
export function getPRFileDiff(
  prNumber: number,
  repo: string,
  filePath: string,
  linesLimit = 1000,
): string {
  try {
    const fullDiff = execSync(`gh pr diff ${prNumber} --repo ${repo}`, {
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large diffs
    });

    // Extract diff for the specific file
    const fileDiff = filterDiffByFiles(fullDiff, [filePath]);

    if (!fileDiff || fileDiff === 'No diffs found for specified files') {
      return `No diff found for ${filePath} in PR #${prNumber}`;
    }

    const lines = fileDiff.split('\n');
    if (lines.length > linesLimit) {
      return `Diff for ${filePath} (from PR #${prNumber}, truncated to ${linesLimit} lines):\n${lines
        .slice(0, linesLimit)
        .join('\n')}`;
    }

    return `Diff for ${filePath} (from PR #${prNumber}):\n${fileDiff}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Could not fetch diff for ${filePath} from PR #${prNumber}: ${message}`;
  }
}

/**
 * Gets files changed in a PR using GitHub CLI
 */
export function getPRFiles(prNumber: number, repo: string): string[] {
  try {
    const files = execSync(
      `gh pr view ${prNumber} --repo ${repo} --json files --jq '.files[].path'`,
      { encoding: 'utf-8' },
    )
      .trim()
      .split('\n')
      .filter((f) => f);

    return files;
  } catch (error) {
    console.error(
      `❌ Failed to fetch files for PR #${prNumber}. Ensure gh CLI is authenticated.`,
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

/**
 * Gets patches for multiple files from a PR using GitHub API
 * Works even for large PRs (300+ files) where `gh pr diff` fails
 */
export function getFilePatchesFromAPI(
  prNumber: number,
  repo: string,
  filePaths: string[],
): Map<string, string> {
  const patches = new Map<string, string>();

  if (filePaths.length === 0) return patches;

  try {
    // Fetch all files with patches in one API call
    const result = execSync(
      `gh api repos/${repo}/pulls/${prNumber}/files --paginate`,
      {
        encoding: 'utf-8',
        maxBuffer: 50 * 1024 * 1024,
      },
    );

    // Parse JSON arrays (--paginate returns newline-separated arrays)
    const jsonArrays = result
      .trim()
      .split('\n')
      .filter((line) => line.startsWith('['));
    const fileSet = new Set(filePaths);

    for (const jsonStr of jsonArrays) {
      const files = JSON.parse(jsonStr);
      for (const file of files) {
        if (fileSet.has(file.filename) && file.patch) {
          patches.set(file.filename, file.patch);
        }
      }
    }

    return patches;
  } catch {
    return patches;
  }
}

/**
 * Validates and sanitizes a PR number to prevent command injection
 * @param input - The input to validate (can be string or number)
 * @returns Safe PR number or null if invalid
 */
export function validatePRNumber(input: unknown): number | null {
  // Convert to number if string
  const num = typeof input === 'string' ? parseInt(input, 10) : input;

  // Check if it's a valid positive integer
  if (
    typeof num !== 'number' ||
    !Number.isInteger(num) ||
    num <= 0 ||
    num > 999999
  ) {
    return null;
  }

  return num;
}

/**
 * Find commit SHA for a build number by searching for version bump commits
 * Looks for commits like "[skip ci] Bump version number to 3678"
 */
export function getCommitForBuild(
  buildNumber: number,
  baseDir: string,
): string | null {
  try {
    const commit = execSync(
      `git log --oneline --grep="Bump version number to ${buildNumber}" --format="%H" -1`,
      {
        encoding: 'utf-8',
        cwd: baseDir,
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    ).trim();

    return commit || null;
  } catch {
    return null;
  }
}

/**
 * Cherry-pick info extracted from git log
 */
export interface CherryPickInfo {
  commit: string;
  message: string;
  prNumber: string | null;
  author: string;
  date: string;
}

/**
 * Get diff for a specific commit
 */
export function getCommitDiff(
  commitSha: string,
  baseDir: string,
  linesLimit = 500,
): string {
  try {
    const safeSha = validateCommitSha(commitSha);
    const diff = execSync(`git show ${safeSha} --format="" --patch`, {
      encoding: 'utf-8',
      cwd: baseDir,
      maxBuffer: 10 * 1024 * 1024,
    });

    const lines = diff.split('\n');
    if (lines.length > linesLimit) {
      return lines.slice(0, linesLimit).join('\n') + '\n... [truncated]';
    }
    return diff;
  } catch {
    return '';
  }
}

/**
 * Get cherry-picks between two builds
 * Returns commits that were added after prevBuild and up to currentBuild
 * First tries to get from PR (for release branches), falls back to local git
 */
export function getCherryPicksBetweenBuilds(
  prevBuildNumber: number,
  currentBuildNumber: number,
  baseDir: string,
  prNumber?: number,
  repo?: string,
): CherryPickInfo[] {
  // Try PR-based lookup first (for release PRs)
  if (prNumber && repo) {
    const prCherryPicks = getCherryPicksFromPR(
      prNumber,
      repo,
      prevBuildNumber,
      currentBuildNumber,
    );
    if (prCherryPicks.length > 0) {
      return prCherryPicks;
    }
  }

  // Fall back to local git log
  const prevCommit = getCommitForBuild(prevBuildNumber, baseDir);
  const currentCommit = getCommitForBuild(currentBuildNumber, baseDir);

  if (!prevCommit || !currentCommit) {
    console.warn(
      `Could not find commits for builds ${prevBuildNumber} or ${currentBuildNumber}`,
    );
    return [];
  }

  try {
    const safePrev = validateCommitSha(prevCommit);
    const safeCurrent = validateCommitSha(currentCommit);
    // Get commits between the two build commits (excluding the prev build commit)
    // Use null byte delimiter (%x00) to avoid issues with pipe characters in commit messages
    const log = execSync(
      `git log ${safePrev}..${safeCurrent} --format="%H%x00%s%x00%an%x00%ad" --date=short`,
      {
        encoding: 'utf-8',
        cwd: baseDir,
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    ).trim();

    if (!log) return [];

    const cherryPicks: CherryPickInfo[] = [];
    const lines = log.split('\n').filter((l) => l);

    for (const line of lines) {
      const [commit, message, author, date] = line.split('\x00');

      // Skip the version bump commit itself
      if (message.includes('Bump version number')) continue;

      // Extract PR number from message like "cherry-pick fix(card): ... (#25800)"
      const prMatch = message.match(/#(\d+)/);

      cherryPicks.push({
        commit,
        message,
        prNumber: prMatch ? `#${prMatch[1]}` : null,
        author,
        date,
      });
    }

    return cherryPicks;
  } catch {
    return [];
  }
}

/**
 * Get cherry-picks between two commits directly
 * Use this when you have commit SHAs from the release PR
 */
export function getCherryPicksBetweenCommits(
  fromCommit: string,
  toCommit: string,
  baseDir: string,
): CherryPickInfo[] {
  try {
    const safeFrom = validateCommitSha(fromCommit);
    const safeTo = validateCommitSha(toCommit);
    // Get commits between the two commit SHAs
    // Use null byte delimiter (%x00) to avoid issues with pipe characters in commit messages
    const log = execSync(
      `git log ${safeFrom}..${safeTo} --format="%H%x00%s%x00%an%x00%ad" --date=short`,
      {
        encoding: 'utf-8',
        cwd: baseDir,
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    ).trim();

    if (!log) return [];

    const cherryPicks: CherryPickInfo[] = [];
    const lines = log.split('\n').filter((l) => l);

    for (const line of lines) {
      const [commit, message, author, date] = line.split('\x00');

      // Skip version bump commits
      if (message.includes('Bump version number')) continue;

      // Extract PR number from message like "cherry-pick fix(card): ... (#25800)"
      const prMatch = message.match(/#(\d+)/);

      cherryPicks.push({
        commit,
        message,
        prNumber: prMatch ? `#${prMatch[1]}` : null,
        author,
        date,
      });
    }

    return cherryPicks;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(
      `   Failed to get commits between ${fromCommit}..${toCommit}: ${msg}`,
    );
    return [];
  }
}

/**
 * Get cherry-picks from a release PR between two build numbers
 * Uses gh CLI to fetch commits from the PR
 */
export function getCherryPicksFromPR(
  prNumber: number,
  repo: string,
  prevBuildNumber: number,
  currentBuildNumber: number,
): CherryPickInfo[] {
  try {
    // Get all commits from the PR
    const commitsJson = execSync(
      `gh pr view ${prNumber} --repo ${repo} --json commits`,
      {
        encoding: 'utf-8',
        maxBuffer: 50 * 1024 * 1024,
      },
    );

    const data = JSON.parse(commitsJson);
    const commits = data.commits || [];

    // Find commits between the two build numbers
    // Build bumps look like: "[skip ci] Bump version number to 3685"
    let inRange = false;
    let foundPrevBuild = false;
    const cherryPicks: CherryPickInfo[] = [];

    for (const commit of commits) {
      const message = commit.messageHeadline || '';
      const buildMatch = message.match(/Bump version number to (\d+)/);

      if (buildMatch) {
        const buildNum = parseInt(buildMatch[1], 10);

        // Start collecting after we pass the previous build
        if (buildNum === prevBuildNumber) {
          foundPrevBuild = true;
          inRange = true;
          continue;
        }

        // Stop when we reach the current build
        if (buildNum === currentBuildNumber) {
          break;
        }
      }

      // Collect cherry-picks while in range
      if (inRange && !message.includes('Bump version number')) {
        const prMatch = message.match(/#(\d+)/);
        cherryPicks.push({
          commit: (commit.oid || '').substring(0, 7),
          message,
          prNumber: prMatch ? `#${prMatch[1]}` : null,
          author: commit.authors?.[0]?.name || 'Unknown',
          date: commit.committedDate?.split('T')[0] || '',
        });
      }
    }

    if (!foundPrevBuild) {
      console.warn(`   Build ${prevBuildNumber} not found in PR commits`);
    }

    return cherryPicks;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`   Failed to get commits from PR: ${msg}`);
    return [];
  }
}
