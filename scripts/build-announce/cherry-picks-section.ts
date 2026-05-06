/**
 * Extracts commits from release branch and builds collapsible markdown section.
 */

import { execSync } from 'child_process';

const REPO_URL = process.env.GITHUB_REPOSITORY
  ? `https://github.com/${process.env.GITHUB_REPOSITORY}`
  : 'https://github.com/MetaMask/metamask-mobile';

const SKIP_CI_BUMP_VERSION_SUBJECT = /^\[skip ci\] Bump version number to/;

function getMergeBase(headRef: string, baseRef: string): string | null {
  try {
    const out = execSync(`git merge-base ${headRef} ${baseRef}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return out.trim() || null;
  } catch {
    return null;
  }
}

function getAncestryPathCommits(
  mergeBaseHash: string,
  headRef: string,
): { hash: string; subject: string }[] {
  try {
    const out = execSync(
      `git log --ancestry-path ${mergeBaseHash}..${headRef} --pretty=format:%h\t%s`,
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
  } catch {
    return [];
  }
}

function formatSubjectWithPrLinks(subject: string): string {
  return subject
    .replace(/\(#(\d+)\)/g, (_, n) => `([#${n}](${REPO_URL}/pull/${n}))`)
    .replace(/(^|\s)#(\d+)\b/g, (_, lead, n) => `${lead}[#${n}](${REPO_URL}/pull/${n})`);
}

export function extractCherryPicks(): { hash: string; subject: string }[] {
  const baseRef = process.env.MERGE_BASE_REF ?? 'origin/main';
  const headRef = (process.env.HEAD_REF ?? '').trim() || 'HEAD';

  const mergeBase = getMergeBase(headRef, baseRef);
  if (!mergeBase) {
    console.log('[cherry-picks] Could not resolve merge-base');
    return [];
  }

  const commits = getAncestryPathCommits(mergeBase, headRef);
  console.log(`[cherry-picks] Found ${commits.length} commit(s)`);
  return commits;
}

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

export function buildCherryPicksFailureSection(error?: string): string {
  let section = `<a id="cherry-picks"></a>
### :cherries: What's in this RC

_Could not extract commit list._`;

  if (error) {
    section += `\n\n<details>\n<summary>Details</summary>\n\n${error}\n\n</details>`;
  }

  return section + '\n';
}
