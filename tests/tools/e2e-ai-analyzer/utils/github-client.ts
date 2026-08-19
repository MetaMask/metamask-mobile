/**
 * GitHub API client for retrieving PR information
 * Uses `gh` CLI for simplicity and authentication
 */

import { execSync } from 'child_process';

export interface PullRequestFile {
  filename: string;
  additions: number;
  deletions: number;
  status: 'added' | 'removed' | 'modified' | 'renamed';
}

export interface TeamSignOff {
  team: string;
  signedOff: boolean;
}

export interface PullRequestInfo {
  number: number;
  title: string;
  body: string;
  author: string;
  baseBranch: string;
  headBranch: string;
  files: PullRequestFile[];
  commitCount: number;
  teamSignOffs: TeamSignOff[];
  /** Actual total file count (may be > files.length due to pagination limits) */
  actualFileCount?: number;
}

/**
 * Fetches PR information using gh CLI
 * Note: gh pr view --json files has a 100 file limit, so we use the API for actual count
 * and paginate to get all files for large PRs
 */
export function getPullRequestInfo(
  prNumber: number,
  repo: string = 'MetaMask/metamask-mobile',
): PullRequestInfo {
  console.log(`📥 Fetching PR #${prNumber} from GitHub...`);

  // Get PR details including actual file count
  const prJson = execSync(`gh api repos/${repo}/pulls/${prNumber}`, {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
  });
  const prData = JSON.parse(prJson);

  // Get PR metadata (title, body, commits)
  const prMetaJson = execSync(
    `gh pr view ${prNumber} --repo ${repo} --json title,body,author,baseRefName,headRefName,commits`,
    { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 },
  );
  const pr = JSON.parse(prMetaJson);

  // Get changed files with pagination for large PRs
  const actualFileCount = prData.changed_files || 0;
  const files: PullRequestFile[] = [];

  // Use --paginate for automatic pagination (handles all pages)
  // Cap at 1000 files to avoid memory issues
  try {
    const allFilesJson = execSync(
      `gh api repos/${repo}/pulls/${prNumber}/files --paginate`,
      { encoding: 'utf-8', maxBuffer: 100 * 1024 * 1024 },
    );

    // --paginate returns newline-separated JSON arrays, need to parse each
    const jsonArrays = allFilesJson
      .trim()
      .split('\n')
      .filter((line) => line.startsWith('['));
    for (const jsonStr of jsonArrays) {
      const pageFiles = JSON.parse(jsonStr);
      for (const f of pageFiles) {
        if (files.length >= 1000) break; // Cap at 1000 files
        files.push({
          filename: f.filename,
          additions: f.additions || 0,
          deletions: f.deletions || 0,
          status: f.status as 'added' | 'removed' | 'modified' | 'renamed',
        });
      }
    }
  } catch {
    // Fallback to simple fetch if pagination fails
    try {
      const filesJson = execSync(
        `gh pr view ${prNumber} --repo ${repo} --json files`,
        { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 },
      );
      const filesData = JSON.parse(filesJson);
      for (const f of filesData.files || []) {
        files.push({
          filename: f.path,
          additions: f.additions || 0,
          deletions: f.deletions || 0,
          status: 'modified' as const,
        });
      }
    } catch {
      // Continue with empty files if all else fails
    }
  }

  // Parse team sign-offs from PR body
  const teamSignOffs = parseTeamSignOffs(pr.body || '');

  console.log(`   ✓ Found: ${pr.title}`);
  console.log(
    `   ✓ ${actualFileCount} files changed (fetched ${files.length} for analysis)`,
  );
  console.log(`   ✓ ${prData.commits || pr.commits?.length || 0} commits`);
  console.log(
    `   ✓ ${teamSignOffs.filter((t) => t.signedOff).length}/${teamSignOffs.length} teams signed off`,
  );

  return {
    number: prNumber,
    title: pr.title,
    body: pr.body || '',
    author: pr.author?.login || 'unknown',
    baseBranch: pr.baseRefName,
    headBranch: pr.headRefName,
    files,
    commitCount: prData.commits || pr.commits?.length || 0,
    teamSignOffs,
    actualFileCount, // Add actual count for display
  };
}

/**
 * Parses team sign-off checklist from PR body
 *
 * Looks for pattern:
 * - [x] Team Name (signed off)
 * - [ ] Team Name (not signed off)
 */
export function parseTeamSignOffs(prBody: string): TeamSignOff[] {
  const signOffs: TeamSignOff[] = [];

  // Find the "Team sign-off checklist" section
  const checklistMatch = prBody.match(
    /Team sign-off checklist[\s\S]*?(?=\n##|\n\*\*|$)/i,
  );
  if (!checklistMatch) {
    return signOffs;
  }

  const checklistSection = checklistMatch[0];

  // Match checkbox items: - [x] or - [ ]
  const checkboxRegex = /- \[(x| )\] (.+)/gi;
  let match;

  while ((match = checkboxRegex.exec(checklistSection)) !== null) {
    const isChecked = match[1].toLowerCase() === 'x';
    const teamName = match[2].trim();

    signOffs.push({
      team: teamName,
      signedOff: isChecked,
    });
  }

  return signOffs;
}

/**
 * Gets sign-off status summary
 */
export function getSignOffSummary(signOffs: TeamSignOff[]): {
  signedOff: string[];
  needsAttention: string[];
} {
  return {
    signedOff: signOffs.filter((t) => t.signedOff).map((t) => t.team),
    needsAttention: signOffs.filter((t) => !t.signedOff).map((t) => t.team),
  };
}

/**
 * Fetches the latest build number from PR comments
 * Looks for github-actions bot comments with "RC Builds Ready for Testing"
 */
export function getLatestBuildFromPRComments(
  prNumber: number,
  repo: string = 'MetaMask/metamask-mobile',
): number | undefined {
  try {
    // Fetch PR comments
    const commentsJson = execSync(
      `gh pr view ${prNumber} --repo ${repo} --json comments`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 },
    );
    const data = JSON.parse(commentsJson);

    // Look for github-actions bot comments with build info
    // Pattern: "RC 7.65.0 (3701)" or "download build 3701"
    const buildPattern =
      /(?:RC\s+[\d.]+\s*\((\d+)\)|download\s+build\s+(\d+))/i;

    // Search comments in reverse order (newest first)
    const comments = data.comments || [];
    for (let i = comments.length - 1; i >= 0; i--) {
      const comment = comments[i];
      // Check if it's from github-actions bot and has build info
      if (
        comment.author?.login === 'github-actions[bot]' &&
        comment.body?.includes('RC Builds Ready for Testing')
      ) {
        const match = comment.body.match(buildPattern);
        if (match) {
          const buildNum = parseInt(match[1] || match[2], 10);
          if (!isNaN(buildNum)) {
            return buildNum;
          }
        }
      }
    }

    return undefined;
  } catch (error) {
    console.warn('   Could not fetch build number from PR comments');
    return undefined;
  }
}
