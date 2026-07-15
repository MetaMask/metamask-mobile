/**
 * Extracts commits from release branch and builds collapsible markdown sections.
 *
 * Two sections are generated:
 * 1. Cherry-picks: Commits on the release branch after forking from main
 * 2. Changelog: Commits since the previous release tag. For Runway releases,
 * falls back to the release branch when main-line changelog is empty or only release commits.
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
 * Get the most recent release tag merged into a given commit.
 * Uses --merged to find the highest version tag that is an ancestor of the commit.
 */
function getPreviousReleaseTag(mergeBase: string): string | null {
  try {
    const out = execFileSync(
      'git',
      ['tag', '--sort=-version:refname', '--list', 'v*.*.*', '--merged', mergeBase],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    const tags = out.trim().split('\n').filter(Boolean);
    // Return first tag (highest version that's an ancestor of merge-base)
    return tags[0] || null;
  } catch {
    return null;
  }
}

/**
 * Get commits between two refs.
 * @param firstParent - If true, use --first-parent for main-line history; otherwise include all commits.
 */
function getCommitsBetween(
  fromRef: string,
  toRef: string,
  firstParent = true,
): { hash: string; subject: string }[] {
  try {
    const args = ['log', `${fromRef}..${toRef}`, '--pretty=format:%h\t%s'];
    if (firstParent) {
      args.push('--first-parent');
    }
    const out = execFileSync('git', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

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
  changelogFromReleaseBranch: boolean;
}

export function extractWhatsInRc(): WhatsInRcResult {
  const baseRef = process.env.MERGE_BASE_REF ?? 'origin/main';
  const headRef = (process.env.HEAD_REF ?? '').trim() || 'HEAD';

  const mergeBase = getMergeBase(headRef, baseRef);

  // Cherry-picks: commits on release branch after fork from main
  const cherryPicks = getAncestryPathCommits(mergeBase, headRef);
  console.log(`[cherry-picks] Found ${cherryPicks.length} commit(s)`);

  // Changelog: commits since previous release tag
  const previousTag = getPreviousReleaseTag(mergeBase);
  let changelog: { hash: string; subject: string }[] = [];
  let changelogFromReleaseBranch = false;

  if (previousTag) {
    // First try: commits on main from previous release to merge-base
    changelog = getCommitsBetween(previousTag, mergeBase, true);
    console.log(
      `[changelog] Found ${changelog.length} commit(s) on main from ${previousTag} to merge-base`,
    );

    // Check if changelog is empty or contains only release commits
    // This happens for Runway releases where features are cherry-picked to release branch
    const isOnlyReleaseCommits =
      changelog.length > 0 && changelog.every((c) => c.subject.startsWith('release:'));

    if (changelog.length === 0 || isOnlyReleaseCommits) {
      console.log(
        `[changelog] Main-line changelog is ${changelog.length === 0 ? 'empty' : 'only release commits'}, falling back to release branch`,
      );
      // Fallback: get commits from release branch since previous tag (without --first-parent)
      changelog = getCommitsBetween(previousTag, headRef, false);
      changelogFromReleaseBranch = true;
      console.log(
        `[changelog] Found ${changelog.length} commit(s) on release branch from ${previousTag}`,
      );
    }
  } else {
    console.log(`[changelog] Could not find previous release tag`);
  }

  return { cherryPicks, changelog, mergeBase, previousTag, changelogFromReleaseBranch };
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

export function buildWhatsInRcSection(result: WhatsInRcResult, buildNumber?: string): string {
  const { cherryPicks, changelog, previousTag, changelogFromReleaseBranch } = result;

  // If both are empty, return nothing
  if (cherryPicks.length === 0 && changelog.length === 0) {
    return '';
  }

  // Use build number for unique anchors so Slack can link to the correct comment
  const isValidBuildNumber = buildNumber && buildNumber !== 'Unknown' && buildNumber !== 'N/A';
  const anchorSuffix = isValidBuildNumber ? `-${buildNumber}` : '';

  const lines: string[] = [
    `<a id="whats-in-this-rc${anchorSuffix}"></a>`,
    '### :cherries: What\'s in this RC\n',
  ];

  // Cherry-picks section
  if (cherryPicks.length > 0) {
    lines.push(`<a id="cherry-picks${anchorSuffix}"></a>`);
    lines.push('<details>');
    lines.push(`<summary>Cherry-picks (${cherryPicks.length} commits)</summary>\n`);
    lines.push(buildCommitTable(cherryPicks));
    lines.push('\n</details>\n');
  }

  // Changelog section
  if (changelog.length > 0) {
    const changelogLabel = changelogFromReleaseBranch
      ? `Changelog (${changelog.length} commits since ${previousTag})`
      : `Changelog (${changelog.length} commits from main at RC cut)`;
    lines.push(`<a id="changelog${anchorSuffix}"></a>`);
    lines.push('<details>');
    lines.push(`<summary>${changelogLabel}</summary>\n`);
    lines.push(buildCommitTable(changelog));
    lines.push('\n</details>\n');
  }

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
