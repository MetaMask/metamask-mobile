/**
 * Slack Hotfix Backport Alert Script
 *
 * When a new minor release branch (e.g. release/7.79.0) is created, this script
 * checks whether the previous minor version (e.g. 7.78.0) received hotfix
 * releases (7.78.1, 7.78.1-ota, etc.) whose commits have NOT been cherry-picked
 * into the new release branch.  It then posts a warning Slack message tagging
 * @release-owner-mobile so the Release Manager can decide whether those fixes
 * need to be brought forward.
 *
 * Required env:
 *   NEW_SEMVER         — the new minor release version, e.g. "7.79.0"
 *   GITHUB_TOKEN       — token with repo:read access
 *   SLACK_BOT_TOKEN    — Slack bot OAuth token
 *
 * Optional env:
 *   GITHUB_REPOSITORY  — defaults to "MetaMask/metamask-mobile"
 *   SLACK_CHANNEL      — overrides the derived release channel
 *   DRY_RUN            — set to "1" or "true" to print payload without posting
 */

const REPO = process.env.GITHUB_REPOSITORY ?? 'MetaMask/metamask-mobile';
const REPO_URL = `https://github.com/${REPO}`;
const API_BASE = `https://api.github.com/repos/${REPO}`;

// ---------------------------------------------------------------------------
// GitHub helpers
// ---------------------------------------------------------------------------

/**
 * @param {string} path - API path relative to the repo base
 * @param {string} token
 * @returns {Promise<unknown>}
 */
async function ghFetch(path, token) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub API ${url} → ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/**
 * Paginates a GitHub list endpoint, collecting all items.
 * @param {string} path
 * @param {string} token
 * @returns {Promise<unknown[]>}
 */
async function ghFetchAll(path, token) {
  const items = [];
  let page = 1;
  while (true) {
    const sep = path.includes('?') ? '&' : '?';
    const data = /** @type {unknown[]} */ (
      await ghFetch(`${path}${sep}per_page=100&page=${page}`, token)
    );
    if (!Array.isArray(data) || data.length === 0) break;
    items.push(...data);
    if (data.length < 100) break;
    page++;
  }
  return items;
}

// ---------------------------------------------------------------------------
// Version utilities
// ---------------------------------------------------------------------------

/**
 * Parse a semver string into { major, minor, patch }.
 * @param {string} version
 * @returns {{ major: number, minor: number, patch: number } | null}
 */
function parseSemver(version) {
  const m = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return null;
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

/**
 * Given a new minor version (patch === 0), derive the previous minor.
 * e.g. 7.79.0 → { major: 7, minor: 78 }
 * @param {{ major: number, minor: number }} v
 * @returns {{ major: number, minor: number }}
 */
function previousMinor(v) {
  if (v.minor > 0) return { major: v.major, minor: v.minor - 1 };
  return { major: v.major - 1, minor: null };
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

/**
 * Find hotfix tags for the given {major}.{minor} line (patch > 0).
 * Looks at git tags (v7.78.1, v7.78.2 …) and release branches
 * (release/7.78.1, release/7.78.1-ota …).
 *
 * @param {number} major
 * @param {number} minor
 * @param {string} token
 * @returns {Promise<string[]>} - sorted list of hotfix semver strings, e.g. ["7.78.1","7.78.2"]
 */
async function findHotfixVersions(major, minor, token) {
  const prefix = `v${major}.${minor}.`;
  /** @type {string[]} */
  const versions = new Set();

  // From tags: v7.78.1, v7.78.1-ota (strip -ota suffix, keep bare semver)
  const tags = /** @type {{ name: string }[]} */ (
    await ghFetchAll(`/git/matching-refs/tags/${prefix}`, token)
  );
  for (const tag of tags) {
    const name = tag.name.replace('refs/tags/', '');
    const bare = name.replace(/^v/, '').replace(/-ota$/, '');
    const parsed = parseSemver(bare);
    if (parsed && parsed.patch > 0) versions.add(bare);
  }

  // From release branches: release/7.78.1, release/7.78.1-ota
  const branchPrefix = `release/${major}.${minor}.`;
  const branches = /** @type {{ ref: string }[]} */ (
    await ghFetchAll(`/git/matching-refs/heads/${branchPrefix}`, token)
  );
  for (const branch of branches) {
    const name = branch.ref.replace('refs/heads/', '');
    const bare = name.replace(/^release\//, '').replace(/-ota$/, '');
    const parsed = parseSemver(bare);
    if (parsed && parsed.patch > 0) versions.add(bare);
  }

  return [...versions].sort((a, b) => {
    const pa = parseSemver(a);
    const pb = parseSemver(b);
    return pa.patch - pb.patch;
  });
}

/**
 * Normalise a commit title for comparison: lowercase, strip punctuation, trim.
 * @param {string} title
 * @returns {string}
 */
function normaliseTitle(title) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Get commits that are in `head` but not in `base` using the GitHub compare API.
 * Returns up to 250 commits (GitHub limit).
 * @param {string} base - tag, branch, or SHA
 * @param {string} head - tag, branch, or SHA
 * @param {string} token
 * @returns {Promise<{ sha: string; message: string; title: string; url: string }[]>}
 */
async function getNewCommits(base, head, token) {
  try {
    const data = /** @type {{ commits: { sha: string; commit: { message: string }; html_url: string }[] }} */ (
      await ghFetch(`/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`, token)
    );
    return (data.commits ?? []).map((c) => {
      const message = c.commit.message ?? '';
      const title = message.split('\n')[0].trim();
      return { sha: c.sha.slice(0, 7), message, title, url: c.html_url };
    });
  } catch (err) {
    console.warn(`  ⚠️  Could not compare ${base}...${head}: ${err.message}`);
    return [];
  }
}

/**
 * Returns the set of normalised commit titles in the new release branch that
 * are ahead of the previous base version tag.
 * @param {string} prevBaseTag - e.g. "v7.78.0"
 * @param {string} newBranch   - e.g. "release/7.79.0"
 * @param {string} token
 * @returns {Promise<Set<string>>}
 */
async function getNewReleaseTitles(prevBaseTag, newBranch, token) {
  const commits = await getNewCommits(prevBaseTag, newBranch, token);
  return new Set(commits.map((c) => normaliseTitle(c.title)));
}

// ---------------------------------------------------------------------------
// Slack helpers
// ---------------------------------------------------------------------------

/**
 * @param {string} newSemver - e.g. "7.79.0"
 * @returns {string} e.g. "#release-mobile-7-79-0"
 */
function deriveSlackChannel(newSemver) {
  return `#release-mobile-${newSemver.replace(/\./g, '-')}`;
}

/**
 * Build the Slack Block Kit payload for the backport alert.
 * @param {{
 *   newSemver: string;
 *   prevSemver: string;
 *   hotfixVersions: string[];
 *   missingByHotfix: Map<string, { sha: string; title: string; url: string }[]>;
 *   workflowUrl: string;
 * }} opts
 * @returns {{ blocks: unknown[]; text: string }}
 */
function buildAlertPayload({ newSemver, prevSemver, hotfixVersions, missingByHotfix, workflowUrl }) {
  const totalMissing = [...missingByHotfix.values()].reduce((s, a) => s + a.length, 0);
  const hasMissing = totalMissing > 0;

  const headerText = hasMissing
    ? `⚠️ Hotfix backport check for v${newSemver} — ${totalMissing} potentially missing commit${totalMissing !== 1 ? 's' : ''}`
    : `✅ Hotfix backport check for v${newSemver} — all commits accounted for`;

  /** @type {unknown[]} */
  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: headerText, emoji: true },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: [
          `A new release branch *<${REPO_URL}/tree/release/${newSemver}|release/${newSemver}>* was created.`,
          `The previous minor release *v${prevSemver}* had ${hotfixVersions.length} hotfix${hotfixVersions.length !== 1 ? 'es' : ''}: ${hotfixVersions.map((v) => `\`v${v}\``).join(', ')}.`,
          hasMissing
            ? `*${totalMissing} commit${totalMissing !== 1 ? 's' : ''} from those hotfixes could not be found in the new release branch.* <!subteam^release-owner-mobile>, please review and cherry-pick if needed.`
            : `All hotfix commits appear to be included in the new release. No action required.`,
        ].join('\n'),
      },
    },
  ];

  if (hasMissing) {
    for (const [hotfixVersion, commits] of missingByHotfix.entries()) {
      if (commits.length === 0) continue;

      const commitLines = commits
        .slice(0, 20) // cap at 20 per hotfix to stay within Slack limits
        .map((c) => `• <${c.url}|\`${c.sha}\`> ${escapeSlack(c.title)}`)
        .join('\n');

      const truncationNote =
        commits.length > 20
          ? `\n_…and ${commits.length - 20} more. <${REPO_URL}/compare/v${hotfixVersion.replace(/-ota$/, '')}~1...v${hotfixVersion}|View all on GitHub>_`
          : '';

      blocks.push(
        { type: 'divider' },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Hotfix \`v${hotfixVersion}\` — ${commits.length} commit${commits.length !== 1 ? 's' : ''} not found in \`release/${newSemver}\`:*\n${commitLines}${truncationNote}`,
          },
        },
      );
    }

    blocks.push(
      { type: 'divider' },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `ℹ️ This is a *warning only* — the fixes may already be unnecessary for v${newSemver}. <!subteam^release-owner-mobile> should confirm. | <${workflowUrl}|View workflow run>`,
          },
        ],
      },
    );
  } else {
    blocks.push(
      { type: 'divider' },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `Checked hotfixes: ${hotfixVersions.map((v) => `\`v${v}\``).join(', ')}. All commits were found by title match in the new release branch. | <${workflowUrl}|View workflow run>`,
          },
        ],
      },
    );
  }

  return {
    blocks,
    text: hasMissing
      ? `⚠️ Hotfix backport alert: v${newSemver} may be missing ${totalMissing} commit(s) from v${prevSemver} hotfixes. @release-owner-mobile please review.`
      : `✅ Hotfix backport check passed for v${newSemver}: all hotfix commits appear to be included.`,
  };
}

/**
 * Escape special Slack mrkdwn characters.
 * @param {string} text
 * @returns {string}
 */
function escapeSlack(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Post a Slack message via the Web API.
 * @param {string} token
 * @param {string} channel
 * @param {{ blocks: unknown[]; text: string }} payload
 * @returns {Promise<boolean>} true on success
 */
async function postToSlack(token, channel, payload) {
  try {
    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({ channel, ...payload }),
    });
    const data = await res.json();
    if (!data.ok) {
      console.error(`❌ Slack API error: ${data.error}`);
      return false;
    }
    console.log(`✅ Slack notification posted to ${channel}`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to post to Slack: ${err.message}`);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const isDryRun =
    process.env.DRY_RUN === '1' || String(process.env.DRY_RUN).toLowerCase() === 'true';

  const newSemver = process.env.NEW_SEMVER?.trim();
  const ghToken = process.env.GITHUB_TOKEN?.trim();
  const slackToken = process.env.SLACK_BOT_TOKEN?.trim();
  const workflowUrl =
    process.env.WORKFLOW_URL ??
    (process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : REPO_URL);

  // --- Validate inputs -------------------------------------------------------
  const missingRequired = [];
  if (!newSemver) missingRequired.push('NEW_SEMVER');
  if (!ghToken) missingRequired.push('GITHUB_TOKEN');
  if (!isDryRun && !slackToken) missingRequired.push('SLACK_BOT_TOKEN');
  if (missingRequired.length > 0) {
    console.warn(`⚠️ Missing required environment variables: ${missingRequired.join(', ')}`);
    console.warn('Skipping hotfix backport alert (non-critical)');
    process.exit(0);
  }

  const newParsed = parseSemver(newSemver);
  if (!newParsed) {
    console.error(`❌ Invalid NEW_SEMVER: "${newSemver}" — expected X.Y.Z`);
    process.exit(1);
  }
  if (newParsed.patch !== 0) {
    console.log(`ℹ️ NEW_SEMVER ${newSemver} is a hotfix (patch=${newParsed.patch}), not a minor release. Skipping backport check.`);
    process.exit(0);
  }

  const prev = previousMinor(newParsed);
  if (prev.minor === null) {
    console.log(`ℹ️ ${newSemver} is the first release of major ${newParsed.major}. No previous minor to check.`);
    process.exit(0);
  }
  const prevSemver = `${prev.major}.${prev.minor}.0`;

  console.log(`\n🔍 Hotfix backport check`);
  console.log(`   New release : v${newSemver} (branch release/${newSemver})`);
  console.log(`   Previous    : v${prevSemver}`);
  if (isDryRun) console.log('🧪 DRY RUN — will not post to Slack');

  // --- Find hotfixes ----------------------------------------------------------
  console.log(`\n📋 Looking for hotfixes on the v${prevSemver} line…`);
  const hotfixVersions = await findHotfixVersions(prev.major, prev.minor, ghToken);

  if (hotfixVersions.length === 0) {
    console.log(`✅ No hotfixes found for v${prevSemver}. Nothing to check.`);
    process.exit(0);
  }
  console.log(`   Found ${hotfixVersions.length} hotfix(es): ${hotfixVersions.map((v) => `v${v}`).join(', ')}`);

  // --- Collect new-release commits for comparison ----------------------------
  const prevBaseTag = `v${prevSemver}`;
  const newBranch = `release/${newSemver}`;

  console.log(`\n📦 Fetching commits in ${newBranch} ahead of ${prevBaseTag}…`);
  const newReleaseTitles = await getNewReleaseTitles(prevBaseTag, newBranch, ghToken);
  console.log(`   Found ${newReleaseTitles.size} distinct commit title(s) in the new release.`);

  // --- Check each hotfix -----------------------------------------------------
  /** @type {Map<string, { sha: string; title: string; url: string }[]>} */
  const missingByHotfix = new Map();

  for (const hotfixVersion of hotfixVersions) {
    // Tags can be v7.78.1 (native) or there may be an -ota variant; we check both
    const candidateTags = [`v${hotfixVersion}`, `v${hotfixVersion}-ota`];

    let hotfixCommits = [];
    for (const tag of candidateTags) {
      const commits = await getNewCommits(prevBaseTag, tag, ghToken);
      if (commits.length > 0) {
        hotfixCommits = commits;
        console.log(`\n  🏷️  Hotfix ${tag}: ${commits.length} commit(s) compared to ${prevBaseTag}`);
        break;
      }
    }

    if (hotfixCommits.length === 0) {
      // Fall back to the release branch if no tag was found
      const branchRef = `release/${hotfixVersion}`;
      hotfixCommits = await getNewCommits(prevBaseTag, branchRef, ghToken);
      if (hotfixCommits.length > 0) {
        console.log(`\n  🌿 Hotfix branch ${branchRef}: ${hotfixCommits.length} commit(s) compared to ${prevBaseTag}`);
      }
    }

    if (hotfixCommits.length === 0) {
      console.log(`  ⚠️  Could not find commits for hotfix v${hotfixVersion}; skipping.`);
      continue;
    }

    const missing = hotfixCommits.filter(
      (c) => !newReleaseTitles.has(normaliseTitle(c.title)),
    );

    console.log(`     → ${missing.length} commit(s) NOT found in ${newBranch}`);
    if (missing.length > 0) {
      missingByHotfix.set(hotfixVersion, missing);
      for (const c of missing) {
        console.log(`       • [${c.sha}] ${c.title}`);
      }
    }
  }

  // --- Build and send Slack payload ------------------------------------------
  const channel = process.env.SLACK_CHANNEL || deriveSlackChannel(newSemver);
  const payload = buildAlertPayload({
    newSemver,
    prevSemver,
    hotfixVersions,
    missingByHotfix,
    workflowUrl,
  });

  if (isDryRun) {
    console.log('\n--- Slack payload (dry run) ---\n');
    console.log(JSON.stringify({ channel, ...payload }, null, 2));
    console.log('\n--- end dry run ---\n');
    return;
  }

  console.log(`\n📣 Posting Slack alert to ${channel}…`);
  const ok = await postToSlack(slackToken, channel, payload);
  if (!ok) {
    console.warn('⚠️ Slack post failed (non-critical). Continuing.');
  }
}

main().catch((err) => {
  console.error('⚠️ Unexpected error (non-critical):', err);
  // Fail open — a notification failure should not break the release pipeline.
});
