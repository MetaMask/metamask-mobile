/**
 * Slack Hotfix Backport Alert Script
 *
 * Checks whether commits from the immediately preceding release were carried
 * forward into a newly-created release branch, and posts a Slack warning if
 * any are potentially missing.
 *
 * Two modes, selected automatically from NEW_SEMVER:
 *
 *   Minor release  (patch === 0, e.g. "7.79.0")
 *     Looks for hotfix tags/branches on the previous minor line (e.g. v7.78.1,
 *     v7.78.2 …) and checks whether their commits exist in the new release
 *     branch (release/7.79.0).
 *
 *   Hotfix release (patch > 0, e.g. "7.79.2" or "7.79.2-ota")
 *     Looks for the previous patches on the same minor line (e.g. v7.79.1)
 *     and checks whether their commits exist in the new hotfix branch
 *     (release/7.79.2 or release/7.79.2-ota).
 *
 * Required env:
 *   GITHUB_TOKEN       — token with repo:read access
 *   SLACK_BOT_TOKEN    — Slack bot OAuth token
 *
 * Optional env:
 *   NEW_SEMVER         — bare semver of the release to check, e.g. "7.79.0"
 *                        If empty, the latest release branch is auto-detected.
 *   IS_OTA             — "true" if the release is an OTA hotfix (release/X.Y.Z-ota)
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
 * Compare two { major, minor, patch } objects. Returns positive if a > b.
 * @param {{ major: number, minor: number, patch: number }} a
 * @param {{ major: number, minor: number, patch: number }} b
 * @returns {number}
 */
function compareSemver(a, b) {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

/**
 * Given a new minor version (patch === 0), derive the previous minor.
 * e.g. 7.79.0 → { major: 7, minor: 78 }
 * @param {{ major: number, minor: number }} v
 * @returns {{ major: number, minor: number | null }}
 */
function previousMinor(v) {
  if (v.minor > 0) return { major: v.major, minor: v.minor - 1 };
  return { major: v.major - 1, minor: null };
}

// ---------------------------------------------------------------------------
// Auto-detect latest release branch
// ---------------------------------------------------------------------------

/**
 * Finds the latest release branch in the repo by listing all release/* refs
 * and picking the highest semver. Strips -ota when comparing so an OTA branch
 * doesn't count as a higher version than its native counterpart.
 *
 * Returns { semver, isOta } where semver is bare X.Y.Z (no -ota suffix).
 *
 * @param {string} token
 * @returns {Promise<{ semver: string; isOta: boolean } | null>}
 */
async function findLatestReleaseBranch(token) {
  const refs = /** @type {{ ref: string }[]} */ (
    await ghFetchAll('/git/matching-refs/heads/release/', token)
  );

  /** @type {{ parsed: { major: number, minor: number, patch: number }, semver: string, isOta: boolean } | null} */
  let best = null;

  for (const r of refs) {
    const name = r.ref.replace('refs/heads/', '');
    const tail = name.replace(/^release\//, '');
    const isOta = tail.endsWith('-ota');
    const bare = isOta ? tail.slice(0, -4) : tail;
    const parsed = parseSemver(bare);
    if (!parsed) continue;
    if (!best || compareSemver(parsed, best.parsed) > 0) {
      best = { parsed, semver: bare, isOta };
    }
  }

  if (!best) return null;
  return { semver: best.semver, isOta: best.isOta };
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

/**
 * Collect all hotfix bare-semver strings on a given {major}.{minor} line
 * (i.e. patch > 0) by inspecting tags and release branches.
 * Strips any -ota suffix so we always work with bare X.Y.Z.
 *
 * @param {number} major
 * @param {number} minor
 * @param {string} token
 * @param {{ maxPatch?: number }} [opts]  — optional upper bound (exclusive) for patch
 * @returns {Promise<string[]>} sorted list, e.g. ["7.78.1","7.78.2"]
 */
async function findHotfixVersions(major, minor, token, opts = {}) {
  /** @type {Set<string>} */
  const versions = new Set();

  // From tags: v7.78.1, v7.78.1-ota
  // NOTE: git/matching-refs returns objects with a `ref` field (not `name`).
  const tagPrefix = `v${major}.${minor}.`;
  const tags = /** @type {{ ref: string }[]} */ (
    await ghFetchAll(`/git/matching-refs/tags/${tagPrefix}`, token)
  );
  for (const tag of tags) {
    const name = tag.ref.replace('refs/tags/', '');
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

  const sorted = [...versions].sort((a, b) => {
    const pa = parseSemver(a);
    const pb = parseSemver(b);
    return pa.patch - pb.patch;
  });

  if (opts.maxPatch !== undefined) {
    return sorted.filter((v) => (parseSemver(v)?.patch ?? 0) < opts.maxPatch);
  }
  return sorted;
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
 * Get commits that are in `head` but not in `base` using the GitHub compare API,
 * paginating to retrieve all commits beyond the default 250-commit cap.
 * @param {string} base - tag, branch, or SHA
 * @param {string} head - tag, branch, or SHA
 * @param {string} token
 * @returns {Promise<{ sha: string; message: string; title: string; url: string }[]>}
 */
async function getNewCommits(base, head, token) {
  try {
    const basehead = `${encodeURIComponent(base)}...${encodeURIComponent(head)}`;
    const allCommits = [];
    let page = 1;

    while (true) {
      const data = /** @type {{ total_commits: number; commits: { sha: string; commit: { message: string }; html_url: string }[] }} */ (
        await ghFetch(`/compare/${basehead}?per_page=100&page=${page}`, token)
      );

      const commits = data.commits ?? [];
      for (const c of commits) {
        const message = c.commit.message ?? '';
        const title = message.split('\n')[0].trim();
        allCommits.push({ sha: c.sha.slice(0, 7), message, title, url: c.html_url });
      }

      // Stop when we've collected all commits or the page returned nothing new.
      if (commits.length === 0 || allCommits.length >= (data.total_commits ?? 0)) break;
      page++;
    }

    return allCommits;
  } catch (err) {
    console.warn(`  ⚠️  Could not compare ${base}...${head}: ${err.message}`);
    return [];
  }
}

/**
 * Returns the set of normalised commit titles in the new release branch that
 * are ahead of the previous base version ref.
 * @param {string} baseRef - e.g. "v7.78.0" or "release/7.78.0"
 * @param {string} newBranch   - e.g. "release/7.79.0"
 * @param {string} token
 * @returns {Promise<Set<string>>}
 */
async function getNewReleaseTitles(baseRef, newBranch, token) {
  const commits = await getNewCommits(baseRef, newBranch, token);
  return new Set(commits.map((c) => normaliseTitle(c.title)));
}

// ---------------------------------------------------------------------------
// Base-ref resolution
// ---------------------------------------------------------------------------

/**
 * Check whether a ref (tag or branch name) exists in the repo.
 * Uses GET /commits/{ref} which resolves tags, branches, and SHAs.
 * @param {string} ref - e.g. "v7.78.0" or "release/7.78.0"
 * @param {string} token
 * @returns {Promise<boolean>}
 */
async function refExists(ref, token) {
  try {
    await ghFetch(`/commits/${encodeURIComponent(ref)}`, token);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve the base ref for a given major.minor.0 release, preferring the tag
 * (vX.Y.0) and falling back to the release branch (release/X.Y.0).
 * Returns null if neither exists.
 * @param {number} major
 * @param {number} minor
 * @param {string} token
 * @returns {Promise<string | null>}
 */
async function resolveBaseRef(major, minor, token) {
  const tag = `v${major}.${minor}.0`;
  if (await refExists(tag, token)) return tag;

  const branch = `release/${major}.${minor}.0`;
  if (await refExists(branch, token)) return branch;

  return null;
}

// ---------------------------------------------------------------------------
// Slack helpers
// ---------------------------------------------------------------------------

/**
 * @param {string} newSemver - e.g. "7.79.0" or "7.79.1-ota"
 * @returns {string} e.g. "#release-mobile-7-79-0" or "#release-mobile-7-79-1-ota"
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
          `The previous release *v${prevSemver}* had ${hotfixVersions.length} hotfix${hotfixVersions.length !== 1 ? 'es' : ''}: ${hotfixVersions.map((v) => `\`v${v}\``).join(', ')}.`,
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

  const ghToken = process.env.GITHUB_TOKEN?.trim();
  const slackToken = process.env.SLACK_BOT_TOKEN?.trim();
  const workflowUrl =
    process.env.WORKFLOW_URL ??
    (process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : REPO_URL);

  // --- Validate required env -----------------------------------------------
  const missingRequired = [];
  if (!ghToken) missingRequired.push('GITHUB_TOKEN');
  if (!isDryRun && !slackToken) missingRequired.push('SLACK_BOT_TOKEN');
  if (missingRequired.length > 0) {
    console.warn(`⚠️ Missing required environment variables: ${missingRequired.join(', ')}`);
    console.warn('Skipping hotfix backport alert (non-critical)');
    process.exit(0);
  }

  // --- Resolve semver: use override or auto-detect latest release branch ----
  let newSemver = process.env.NEW_SEMVER?.trim() || '';
  let isOta = process.env.IS_OTA === 'true';

  if (!newSemver) {
    console.log('ℹ️ NEW_SEMVER not set — auto-detecting latest release branch…');
    const latest = await findLatestReleaseBranch(ghToken);
    if (!latest) {
      console.warn('⚠️ No release/* branches found. Nothing to check.');
      process.exit(0);
    }
    newSemver = latest.semver;
    isOta = latest.isOta;
    console.log(`   Detected: release/${newSemver}${isOta ? '-ota' : ''}`);
  }

  const newParsed = parseSemver(newSemver);
  if (!newParsed) {
    console.error(`❌ Invalid semver: "${newSemver}" — expected X.Y.Z`);
    process.exit(1);
  }

  // The label used for Slack channel derivation includes the -ota suffix.
  const newSemverLabel = isOta ? `${newSemver}-ota` : newSemver;
  // The branch name for compare operations.
  const newBranch = isOta ? `release/${newSemver}-ota` : `release/${newSemver}`;

  if (isDryRun) console.log('🧪 DRY RUN — will not post to Slack');

  // -------------------------------------------------------------------------
  // MODE A — new minor release (patch === 0)
  //   Check hotfixes on the previous minor line: 7.78.1, 7.78.2 …
  // -------------------------------------------------------------------------
  if (newParsed.patch === 0) {
    const prev = previousMinor(newParsed);
    if (prev.minor === null) {
      console.log(`ℹ️ ${newSemver} is the first release of major ${newParsed.major}. No previous minor to check.`);
      process.exit(0);
    }

    const prevBaseSemver = `${prev.major}.${prev.minor}.0`;

    console.log(`\n🔍 Hotfix backport check — minor release mode`);
    console.log(`   New release : v${newSemver} (branch ${newBranch})`);
    console.log(`   Checking    : hotfixes on the v${prevBaseSemver} line`);

    // Resolve the base ref — skip rather than fire false alarms if missing.
    console.log(`\n🔗 Resolving base ref for v${prevBaseSemver}…`);
    const prevBaseRef = await resolveBaseRef(prev.major, prev.minor, ghToken);
    if (!prevBaseRef) {
      console.warn(`⚠️ Neither tag v${prevBaseSemver} nor branch release/${prevBaseSemver} exists. Skipping to avoid false alarms.`);
      process.exit(0);
    }
    console.log(`   Using base: ${prevBaseRef}`);

    console.log(`\n📋 Looking for hotfixes on the v${prevBaseSemver} line…`);
    const hotfixVersions = await findHotfixVersions(prev.major, prev.minor, ghToken);

    if (hotfixVersions.length === 0) {
      console.log(`✅ No hotfixes found for v${prevBaseSemver}. Nothing to check.`);
      process.exit(0);
    }
    console.log(`   Found ${hotfixVersions.length} hotfix(es): ${hotfixVersions.map((v) => `v${v}`).join(', ')}`);

    console.log(`\n📦 Fetching commits in ${newBranch} ahead of ${prevBaseRef}…`);
    const newReleaseTitles = await getNewReleaseTitles(prevBaseRef, newBranch, ghToken);
    console.log(`   Found ${newReleaseTitles.size} distinct commit title(s) in the new release.`);

    /** @type {Map<string, { sha: string; title: string; url: string }[]>} */
    const missingByHotfix = new Map();
    await checkHotfixCommits(hotfixVersions, prevBaseRef, newReleaseTitles, newBranch, ghToken, missingByHotfix);

    await postAlert({
      newSemver: newSemverLabel,
      prevSemver: prevBaseSemver,
      hotfixVersions,
      missingByHotfix,
      workflowUrl,
      channel: process.env.SLACK_CHANNEL || deriveSlackChannel(newSemverLabel),
      slackToken,
      isDryRun,
    });
    return;
  }

  // -------------------------------------------------------------------------
  // MODE B — new hotfix / OTA release (patch > 0)
  //   Check the immediately preceding patch(es) on the same minor line.
  //   e.g. release/7.79.2 → check v7.79.1
  //        release/7.79.2-ota → same
  // -------------------------------------------------------------------------
  const minorBaseSemver = `${newParsed.major}.${newParsed.minor}.0`;

  console.log(`\n🔍 Hotfix backport check — hotfix mode`);
  console.log(`   New hotfix  : v${newSemverLabel} (branch ${newBranch})`);
  console.log(`   Checking    : previous patches on the v${minorBaseSemver} line`);

  // Resolve the base ref for this minor line.
  console.log(`\n🔗 Resolving base ref for v${minorBaseSemver}…`);
  const minorBaseRef = await resolveBaseRef(newParsed.major, newParsed.minor, ghToken);
  if (!minorBaseRef) {
    console.warn(`⚠️ Neither tag v${minorBaseSemver} nor branch release/${minorBaseSemver} exists. Skipping to avoid false alarms.`);
    process.exit(0);
  }
  console.log(`   Using base: ${minorBaseRef}`);

  // Find all patches strictly below the new patch on the same minor line.
  console.log(`\n📋 Looking for previous patches on the v${minorBaseSemver} line (patch < ${newParsed.patch})…`);
  const prevPatches = await findHotfixVersions(
    newParsed.major, newParsed.minor, ghToken,
    { maxPatch: newParsed.patch },
  );

  if (prevPatches.length === 0) {
    console.log(`✅ No previous patches found for v${minorBaseSemver}. Nothing to check.`);
    process.exit(0);
  }
  console.log(`   Found ${prevPatches.length} previous patch(es): ${prevPatches.map((v) => `v${v}`).join(', ')}`);

  // Compare against the minor base so we capture commits added by each patch.
  console.log(`\n📦 Fetching commits in ${newBranch} ahead of ${minorBaseRef}…`);
  const newReleaseTitles = await getNewReleaseTitles(minorBaseRef, newBranch, ghToken);
  console.log(`   Found ${newReleaseTitles.size} distinct commit title(s) in the new hotfix branch.`);

  /** @type {Map<string, { sha: string; title: string; url: string }[]>} */
  const missingByHotfix = new Map();
  await checkHotfixCommits(prevPatches, minorBaseRef, newReleaseTitles, newBranch, ghToken, missingByHotfix);

  // For the Slack message label, use the immediately preceding patch.
  const prevSemverLabel = prevPatches[prevPatches.length - 1];

  await postAlert({
    newSemver: newSemverLabel,
    prevSemver: prevSemverLabel,
    hotfixVersions: prevPatches,
    missingByHotfix,
    workflowUrl,
    channel: process.env.SLACK_CHANNEL || deriveSlackChannel(newSemverLabel),
    slackToken,
    isDryRun,
  });
}

// ---------------------------------------------------------------------------
// Shared helpers used by both modes
// ---------------------------------------------------------------------------

/**
 * For each hotfix version, get its commits (vs the shared base), then record
 * which ones are absent from the new release's commit-title set.
 *
 * Ref candidates tried in order:
 *   1. Tag vX.Y.Z  (authoritative; OTA hotfixes share the same tag)
 *   2. Release branch release/X.Y.Z
 *   3. OTA release branch release/X.Y.Z-ota
 *
 * @param {string[]} hotfixVersions
 * @param {string} baseRef
 * @param {Set<string>} newReleaseTitles
 * @param {string} newBranch
 * @param {string} token
 * @param {Map<string, { sha: string; title: string; url: string }[]>} missingByHotfix
 */
async function checkHotfixCommits(hotfixVersions, baseRef, newReleaseTitles, newBranch, token, missingByHotfix) {
  for (const hotfixVersion of hotfixVersions) {
    // Prefer the tag (authoritative, covers OTA commits too).
    // Fall back to the release branch if the tag hasn't been cut yet.
    const candidates = [
      `v${hotfixVersion}`,
      `release/${hotfixVersion}`,
      `release/${hotfixVersion}-ota`,
    ];

    let hotfixCommits = [];
    for (const ref of candidates) {
      const commits = await getNewCommits(baseRef, ref, token);
      if (commits.length > 0) {
        const icon = ref.startsWith('v') ? '🏷️ ' : '🌿';
        console.log(`\n  ${icon} ${ref}: ${commits.length} commit(s) compared to ${baseRef}`);
        hotfixCommits = commits;
        break;
      }
    }

    if (hotfixCommits.length === 0) {
      console.log(`  ⚠️  Could not find commits for v${hotfixVersion}; skipping.`);
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
}

/**
 * Build the Slack payload and post (or dry-run print) it.
 * @param {{
 *   newSemver: string;
 *   prevSemver: string;
 *   hotfixVersions: string[];
 *   missingByHotfix: Map<string, { sha: string; title: string; url: string }[]>;
 *   workflowUrl: string;
 *   channel: string;
 *   slackToken: string | undefined;
 *   isDryRun: boolean;
 * }} opts
 */
async function postAlert({ newSemver, prevSemver, hotfixVersions, missingByHotfix, workflowUrl, channel, slackToken, isDryRun }) {
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
