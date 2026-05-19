/**
 * Extracts commits from release branch and builds collapsible markdown sections.
 *
 * Two sections are generated:
 * 1. Cherry-picks: Commits on the release branch after forking from main
 * 2. Changelog: Commits on main between the previous release and the RC cut point
 */

import { execFileSync } from 'child_process';

const REPO_URL = process.env.GITHUB_REPOSITORY
  ? `https://github.com/${process.env.GITHUB_REPOSITORY}`
  : 'https://github.com/MetaMask/metamask-mobile';

const SKIP_CI_BUMP_VERSION_SUBJECT = /^\[skip ci\] Bump version number to/;
const SKIP_MERGE_COMMIT_SUBJECT = /^Merge (branch|pull request|remote-tracking)/;

function getMergeBase(headRef: string, baseRef: string): string {
  const out = execFileSync('git', ['merge-base', headRef, baseRef], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const sha = out.trim();
  if (!sha) {
    throw new Error(`git merge-base returned empty for ${headRef} and ${baseRef}`);
  }
  return sha;
}

function getAncestryPathCommits(
  mergeBaseHash: string,
  headRef: string,
): { hash: string; subject: string }[] {
  const out = execFileSync(
    'git',
    ['log', '--ancestry-path', `${mergeBaseHash}..${headRef}`, '--pretty=format:%h\t%s'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );

  if (!out.trim()) return [];

  return out
    .trim()
    .split('\n')
    .filter((line) => {
      const tab = line.indexOf('\t');
      const subject = tab >= 0 ? line.slice(tab + 1) : line;
      return !SKIP_CI_BUMP_VERSION_SUBJECT.test(subject.trim());
    })
    .map((line) => {
      const tab = line.indexOf('\t');
      return {
        hash: tab >= 0 ? line.slice(0, tab) : '',
        subject: tab >= 0 ? line.slice(tab + 1) : line,
      };
    });
}

/**
 * Get the most recent release tag before a given commit
 */
function getPreviousReleaseTag(beforeCommit: string): string | null {
  try {
    // Get the most recent tag reachable from the commit, matching v*.*.* pattern
    const out = execFileSync(
      'git',
      ['describe', '--tags', '--abbrev=0', '--match', 'v*.*.*', `${beforeCommit}^`],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    return out.trim() || null;
  } catch {
    // Fallback: list tags that are ancestors of (merged into) the commit
    try {
      const out = execFileSync(
        'git',
        ['tag', '--sort=-version:refname', '--list', 'v*.*.*', '--merged', beforeCommit],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      );
      const tags = out.trim().split('\n').filter(Boolean);
      // Return first tag (highest version that's actually an ancestor)
      return tags[0] || null;
    } catch {
      return null;
    }
  }
}

/**
 * Get commits between two refs (for changelog - commits on main)
 */
function getCommitsBetween(
  fromRef: string,
  toRef: string,
): { hash: string; subject: string }[] {
  try {
    const out = execFileSync(
      'git',
      ['log', `${fromRef}..${toRef}`, '--pretty=format:%h\t%s', '--first-parent'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );

    if (!out.trim()) return [];

    return out
      .trim()
      .split('\n')
      .filter((line) => {
        const tab = line.indexOf('\t');
        const subject = tab >= 0 ? line.slice(tab + 1) : line;
        // Skip version bumps and merge commits
        return (
          !SKIP_CI_BUMP_VERSION_SUBJECT.test(subject.trim()) &&
          !SKIP_MERGE_COMMIT_SUBJECT.test(subject.trim())
        );
      })
      .map((line) => {
        const tab = line.indexOf('\t');
        return {
          hash: tab >= 0 ? line.slice(0, tab) : '',
          subject: tab >= 0 ? line.slice(tab + 1) : line,
        };
      });
  } catch {
    return [];
  }
}

function formatSubjectWithPrLinks(subject: string): string {
  return subject
    .replace(/\(#(\d+)\)/g, (_, n) => `([#${n}](${REPO_URL}/pull/${n}))`)
    .replace(/(^|\s)#(\d+)\b/g, (_, lead, n) => `${lead}[#${n}](${REPO_URL}/pull/${n})`);
}

export interface WhatsInRcResult {
  cherryPicks: { hash: string; subject: string }[];
  changelog: { hash: string; subject: string }[];
  mergeBase: string;
  previousTag: string | null;
}

export function extractWhatsInRc(): WhatsInRcResult {
  const baseRef = process.env.MERGE_BASE_REF ?? 'origin/main';
  const headRef = (process.env.HEAD_REF ?? '').trim() || 'HEAD';

  const mergeBase = getMergeBase(headRef, baseRef);

  // Cherry-picks: commits on release branch after fork from main
  const cherryPicks = getAncestryPathCommits(mergeBase, headRef);
  console.log(`[cherry-picks] Found ${cherryPicks.length} commit(s)`);

  // Changelog: commits on main from previous release to merge-base
  const previousTag = getPreviousReleaseTag(mergeBase);
  let changelog: { hash: string; subject: string }[] = [];

  if (previousTag) {
    changelog = getCommitsBetween(previousTag, mergeBase);
    console.log(`[changelog] Found ${changelog.length} commit(s) from ${previousTag} to merge-base`);
  } else {
    console.log(`[changelog] Could not find previous release tag`);
  }

  return { cherryPicks, changelog, mergeBase, previousTag };
}

// Keep for backwards compatibility
export function extractCherryPicks(): { hash: string; subject: string }[] {
  return extractWhatsInRc().cherryPicks;
}

function buildCommitTable(commits: { hash: string; subject: string }[]): string {
  const lines: string[] = [
    '| Commit | Description |',
    '| :--- | :--- |',
  ];

  for (const commit of commits) {
    const linkedSubject = formatSubjectWithPrLinks(commit.subject);
    const commitLink = `[\`${commit.hash}\`](${REPO_URL}/commit/${commit.hash})`;
    lines.push(`| ${commitLink} | ${linkedSubject} |`);
  }

  return lines.join('\n');
}

export function buildWhatsInRcSection(result: WhatsInRcResult): string {
  const { cherryPicks, changelog } = result;

  // If both are empty, return nothing
  if (cherryPicks.length === 0 && changelog.length === 0) {
    return '';
  }

  const lines: string[] = [
    '<a id="whats-in-this-rc"></a>',
    '### :cherries: What\'s in this RC\n',
  ];

  // Cherry-picks section
  if (cherryPicks.length > 0) {
    lines.push('<a id="cherry-picks"></a>');
    lines.push('<details>');
    lines.push(`<summary>Cherry-picks (${cherryPicks.length} commits)</summary>\n`);
    lines.push(buildCommitTable(cherryPicks));
    lines.push('\n</details>\n');
  }

  // Changelog section
  if (changelog.length > 0) {
    lines.push('<a id="changelog"></a>');
    lines.push('<details>');
    lines.push(`<summary>Changelog (${changelog.length} commits from main at RC cut)</summary>\n`);
    lines.push(buildCommitTable(changelog));
    lines.push('\n</details>\n');
  }

  return lines.join('\n');
}

// Keep for backwards compatibility
export function buildCherryPicksSection(
  commits: { hash: string; subject: string }[],
): string {
  if (commits.length === 0) return '';

  const lines: string[] = [
    '<a id="cherry-picks"></a>',
    '### :cherries: What\'s in this RC\n',
    '<details>',
    `<summary>${commits.length} commit(s) in this release</summary>\n`,
    '| Commit | Description |',
    '| :--- | :--- |',
  ];

  for (const commit of commits) {
    const linkedSubject = formatSubjectWithPrLinks(commit.subject);
    const commitLink = `[\`${commit.hash}\`](${REPO_URL}/commit/${commit.hash})`;
    lines.push(`| ${commitLink} | ${linkedSubject} |`);
  }

  lines.push('\n</details>\n');
  return lines.join('\n');
}

export function buildWhatsInRcFailureSection(error?: string): string {
  let section = `<a id="whats-in-this-rc"></a>
### :cherries: What's in this RC

_Could not extract commit list._`;

  if (error) {
    section += `\n\n<details>\n<summary>Details</summary>\n\n${error}\n\n</details>`;
  }

  return section + '\n';
}

// Keep for backwards compatibility
export function buildCherryPicksFailureSection(error?: string): string {
  return buildWhatsInRcFailureSection(error);
}
