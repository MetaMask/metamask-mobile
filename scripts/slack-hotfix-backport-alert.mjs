/**
 * Slack Hotfix Backport Alert Script
 *
 * Checks whether commits from the immediately preceding release were carried
 * forward into the current release branch, and posts a Slack warning if any
 * are potentially missing.
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
 * On scheduled (auto-detect) runs BOTH checks run for the current minor line:
 *   1. Mode A: cross-minor check (did prior-minor hotfixes land in X.Y.0?)
 *   2. Mode B: hotfix check (if a patch branch exists, are prior patches in it?)
 *
 * Required env:
 *   GITHUB_TOKEN       — token with repo:read access
 *   SLACK_BOT_TOKEN    — Slack bot OAuth token (not required for DRY_RUN)
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
 * does not count as a higher version than its native counterpart.
 *
 * Tie-break is deterministic: when two refs share the same bare semver
 * (e.g. release/7.79.1 and release/7.79.1-ota), the -ota variant wins.
 * In practice this combination never exists since OTA is a shipping label,
 * not a separate version; the tie-break is a defensive guard only.
 *
 * @param {string} token
 * @returns {Promise<{ semver: string; isOta: boolean; parsed: { major: number, minor: number, patch: number } } | null>}
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

    const cmp = best ? compareSemver(parsed, best.parsed) : 1;
    // Update when strictly higher, or equal semver and this variant is -ota
    if (cmp > 0 || (cmp === 0 && isOta && !best.isOta)) {
      best = { parsed, semver: bare, isOta };
    }
  }

  if (!best) return null;
  return { semver: best.semver, isOta: best.isOta, parsed: best.parsed };
}

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------

/**
 * Collect all hotfix bare-semver strings on a given {major}.{minor} line
 * (i.e. patch > 0) by inspecting tags and release branches.
 * Strips any -ota suffix so we always work with bare X.Y.Z.
 *
 * NOTE: git/matching-refs returns objects with a `ref` field (not `name`).
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
    return (pa?.patch ?? 0) - (pb?.patch ?? 0);
  });

  if (opts.maxPatch !== undefined) {
    const maxPatch = opts.maxPatch; // capture for closure narrowing
    return sorted.filter((v) => (parseSemver(v)?.patch ?? 0) < maxPatch);
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
 *
 * Returns { ok: true, commits } on success, { ok: false, commits: [] } when the
 * compare fails (network error, bad ref, 404, etc.) so callers can distinguish
 * "successfully compared with 0 results" from "could not compare".
 *
 * @param {string} base - tag, branch, or SHA
 * @param {string} head - tag, branch, or SHA
 * @param {string} token
 * @returns {Promise<{ ok: boolean; commits: { sha: string; message: string; title: string; url: string }[] }>}
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

      if (commits.length === 0) break;
      // total_commits is always present in the GitHub compare response; guard defensively
      if (data.total_commits != null && allCommits.length >= data.total_commits) break;
      page++;
    }

    return { ok: true, commits: allCommits };
  } catch (err) {
    console.warn(`  ⚠️  Could not compare ${base}...${head}: ${err.message}`);
    return { ok: false, commits: [] };
  }
}

/**
 * Returns the set of normalised commit titles in `newBranch` that are ahead of
 * `baseRef`, propagating the ok flag from the underlying compare.
 *
 * @param {string} baseRef - e.g. "v7.78.0" or "release/7.78.0"
 * @param {string} newBranch - e.g. "release/7.79.0"
 * @param {string} token
 * @returns {Promise<{ ok: boolean; titles: Set<string> }>}
 */
async function getNewReleaseTitles(baseRef, newBranch, token) {
  const { ok, commits } = await getNewCommits(baseRef, newBranch, token);
  return { ok, titles: new Set(commits.map((c) => normaliseTitle(c.title))) };
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
 * @param {string} semverLabel - e.g. "7.79.0" or "7.79.1-ota"
 * @returns {string} e.g. "#release-mobile-7-79-0" or "#release-mobile-7-79-1-ota"
 */
function deriveSlackChannel(semverLabel) {
  return `#release-mobile-${semverLabel.replace(/\./g, '-')}`;
}

/**
 * Build the Slack Block Kit payload for the backport alert.
 * @param {{
 *   newSemver: string;
 *   prevSemver: string;
 *   hotfixVersions: string[];
 *   missingByHotfix: Map<string, { sha: string; title: string; url: string }[]>;
 *   unverifiedHotfixes: Map<string, string>;
 *   workflowUrl: string;
 * }} opts
 * @returns {{ blocks: unknown[]; text: string }}
 */
function buildAlertPayload({ newSemver, prevSemver, hotfixVersions, missingByHotfix, unverifiedHotfixes, workflowUrl }) {
  const totalMissing = [...missingByHotfix.values()].reduce((s, a) => s + a.length, 0);
  const hasMissing = totalMissing > 0;
  const unverifiedCount = unverifiedHotfixes.size;
  const hasUnverified = unverifiedCount > 0;

  let headerText;
  if (hasMissing) {
    headerText = `⚠️ Hotfix backport check for v${newSemver} — ${totalMissing} potentially missing commit${totalMissing !== 1 ? 's' : ''}`;
  } else if (hasUnverified) {
    headerText = `⚠️ Hotfix backport check for v${newSemver} — ${unverifiedCount} hotfix${unverifiedCount !== 1 ? 'es' : ''} could not be verified`;
  } else {
    headerText = `✅ Hotfix backport check for v${newSemver} — all commits accounted for`;
  }

  let introText;
  if (hasMissing) {
    introText = `*${totalMissing} commit${totalMissing !== 1 ? 's' : ''} from those hotfixes could not be found in the new release branch.* <!subteam^release-owner-mobile>, please review and cherry-pick if needed.`;
  } else if (hasUnverified) {
    introText = `*${unverifiedCount} hotfix${unverifiedCount !== 1 ? 'es' : ''} could not be verified* — no accessible tag or branch was found. <!subteam^release-owner-mobile>, please check that the refs exist.`;
  } else {
    introText = `All hotfix commits appear to be included in the new release. No action required.`;
  }

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
          `Checking release branch *<${REPO_URL}/tree/release/${newSemver}|release/${newSemver}>*.`,
          `The previous release *v${prevSemver}* had ${hotfixVersions.length} hotfix${hotfixVersions.length !== 1 ? 'es' : ''}: ${hotfixVersions.map((v) => `\`v${v}\``).join(', ')}.`,
          introText,
        ].join('\n'),
      },
    },
  ];

  // Missing-commits sections (one per hotfix)
  if (hasMissing) {
    for (const [hotfixVersion, commits] of missingByHotfix.entries()) {
      if (commits.length === 0) continue;

      const commitLines = commits
        .slice(0, 20)
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
  }

  // Unverified-hotfixes section
  if (hasUnverified) {
    const unverifiedLines = [...unverifiedHotfixes.keys()].map((v) => `• \`v${v}\``).join('\n');
    blocks.push(
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Could not verify ${unverifiedCount} hotfix${unverifiedCount !== 1 ? 'es' : ''} — no accessible ref found:*\n${unverifiedLines}\nCheck that the tag or release branch exists and is accessible.`,
        },
      },
    );
  }

  // Footer
  if (hasMissing || hasUnverified) {
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

  let fallbackText;
  if (hasMissing) {
    fallbackText = `⚠️ Hotfix backport alert: v${newSemver} may be missing ${totalMissing} commit(s) from v${prevSemver} hotfixes. @release-owner-mobile please review.`;
  } else if (hasUnverified) {
    fallbackText = `⚠️ Hotfix backport check for v${newSemver}: ${unverifiedCount} hotfix${unverifiedCount !== 1 ? 'es' : ''} could not be verified. @release-owner-mobile please review.`;
  } else {
    fallbackText = `✅ Hotfix backport check passed for v${newSemver}: all hotfix commits appear to be included.`;
  }

  return { blocks, text: fallbackText };
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
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * For each hotfix version, get its commits (vs the shared base) and record:
 *   - missingByHotfix: commits not found in newReleaseTitles
 *   - unverifiedHotfixes: hotfixes where no ref was accessible (not a false negative)
 *
 * Ref candidates tried in order:
 *   1. Tag vX.Y.Z  (authoritative; OTA hotfixes share the same tag)
 *   2. Release branch release/X.Y.Z
 *   3. OTA release branch release/X.Y.Z-ota
 *
 * Distinguishes "compare succeeded with 0 commits" (hotfix already in base,
 * nothing to check) from "compare failed" (ref inaccessible → unverified).
 *
 * @param {string[]} hotfixVersions
 * @param {string} baseRef
 * @param {Set<string>} newReleaseTitles
 * @param {string} newBranch
 * @param {string} token
 * @param {Map<string, { sha: string; title: string; url: string }[]>} missingByHotfix
 * @param {Map<string, string>} unverifiedHotfixes
 */
async function checkHotfixCommits(hotfixVersions, baseRef, newReleaseTitles, newBranch, token, missingByHotfix, unverifiedHotfixes) {
  for (const hotfixVersion of hotfixVersions) {
    const candidates = [
      `v${hotfixVersion}`,
      `release/${hotfixVersion}`,
      `release/${hotfixVersion}-ota`,
    ];

    /** @type {{ sha: string; message: string; title: string; url: string }[] | null} */
    let hotfixCommits = null; // null = no accessible ref found yet
    /** @type {string | null} */
    let usedRef = null;

    for (const ref of candidates) {
      const { ok, commits } = await getNewCommits(baseRef, ref, token);
      if (!ok) continue; // ref inaccessible (404, network error, etc.)
      // ref is accessible — commits may be empty if the hotfix shares history with base
      hotfixCommits = commits;
      usedRef = ref;
      break;
    }

    if (hotfixCommits === null) {
      // No candidate ref was accessible: record as unverified rather than assuming all-ok
      console.log(`  ⚠️  Could not verify v${hotfixVersion}: no accessible ref found.`);
      unverifiedHotfixes.set(hotfixVersion, 'no accessible ref found');
      continue;
    }

    // usedRef is always set when hotfixCommits !== null (assigned together in the loop above)
    const resolvedRef = /** @type {string} */ (usedRef);
    const icon = resolvedRef.startsWith('v') ? '🏷️ ' : '🌿';

    if (hotfixCommits.length === 0) {
      // Ref accessible but no unique commits vs base (already merged into base)
      console.log(`\n  ${icon} ${resolvedRef}: 0 commit(s) ahead of ${baseRef} — already in base.`);
      continue;
    }

    console.log(`\n  ${icon} ${resolvedRef}: ${hotfixCommits.length} commit(s) compared to ${baseRef}`);

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
 * Build the Slack payload and post it — or, in dry-run mode, print it.
 * Only posts when there is something actionable: missing commits or unverified
 * hotfixes. On a clean pass, logs success and skips the Slack call so the
 * weekly cron does not flood the release channel with passing messages.
 *
 * @param {{
 *   newSemver: string;
 *   prevSemver: string;
 *   hotfixVersions: string[];
 *   missingByHotfix: Map<string, { sha: string; title: string; url: string }[]>;
 *   unverifiedHotfixes: Map<string, string>;
 *   workflowUrl: string;
 *   channel: string;
 *   slackToken: string | undefined;
 *   isDryRun: boolean;
 * }} opts
 */
async function postAlert({ newSemver, prevSemver, hotfixVersions, missingByHotfix, unverifiedHotfixes, workflowUrl, channel, slackToken, isDryRun }) {
  const totalMissing = [...missingByHotfix.values()].reduce((s, a) => s + a.length, 0);
  const shouldPost = totalMissing > 0 || unverifiedHotfixes.size > 0;

  const payload = buildAlertPayload({
    newSemver,
    prevSemver,
    hotfixVersions,
    missingByHotfix,
    unverifiedHotfixes,
    workflowUrl,
  });

  if (isDryRun) {
    console.log('\n--- Slack payload (dry run) ---\n');
    console.log(JSON.stringify({ channel, ...payload }, null, 2));
    if (!shouldPost) {
      console.log('\nℹ️ (dry run) Nothing actionable — this would NOT post to Slack in a live run.');
    }
    console.log('\n--- end dry run ---\n');
    return;
  }

  if (!shouldPost) {
    console.log(`✅ All hotfix commits verified as present in release/${newSemver}. No Slack alert needed.`);
    return;
  }

  if (!slackToken) {
    console.warn('⚠️ SLACK_BOT_TOKEN is not set. Cannot post alert (non-critical).');
    return;
  }

  console.log(`\n📣 Posting Slack alert to ${channel}…`);
  const ok = await postToSlack(slackToken, channel, payload);
  if (!ok) {
    console.warn('⚠️ Slack post failed (non-critical). Continuing.');
  }
}

/**
 * Run the full backport check for a single release semver.
 *
 * Used both for manual workflow_dispatch runs (single call) and auto-detect
 * scheduled runs (called twice: once for X.Y.0 cross-minor, once for latest
 * patch). Uses return instead of process.exit so it can be called multiple times.
 *
 * @param {string} semver - bare X.Y.Z (no -ota suffix)
 * @param {boolean} isOta
 * @param {{ ghToken: string; slackToken: string | undefined; isDryRun: boolean; workflowUrl: string }} ctx - ghToken is guaranteed non-empty (validated in main)
 * @returns {Promise<void>}
 */
async function runCheckForRelease(semver, isOta, ctx) {
  const { ghToken, slackToken, isDryRun, workflowUrl } = ctx;

  const parsed = parseSemver(semver);
  if (!parsed) {
    console.error(`❌ Invalid semver: "${semver}" — expected bare X.Y.Z (e.g. "7.79.1"). For OTA releases, pass the bare semver and set IS_OTA=true separately.`);
    return;
  }

  const semverLabel = isOta ? `${semver}-ota` : semver;
  const newBranch = isOta ? `release/${semver}-ota` : `release/${semver}`;

  // -------------------------------------------------------------------------
  // MODE A — minor release (patch === 0)
  //   Check hotfixes on the previous minor line: 7.78.1, 7.78.2 …
  // -------------------------------------------------------------------------
  if (parsed.patch === 0) {
    const prev = previousMinor(parsed);
    if (prev.minor === null) {
      console.log(`ℹ️ ${semver} is the first release of major ${parsed.major}. No previous minor to check.`);
      return;
    }

    const prevBaseSemver = `${prev.major}.${prev.minor}.0`;

    console.log(`\n🔍 Hotfix backport check — minor release mode`);
    console.log(`   New release : v${semver} (branch ${newBranch})`);
    console.log(`   Checking    : hotfixes on the v${prevBaseSemver} line`);

    // Resolve the base ref — skip rather than fire false alarms if missing
    console.log(`\n🔗 Resolving base ref for v${prevBaseSemver}…`);
    const prevBaseRef = await resolveBaseRef(prev.major, prev.minor, ghToken);
    if (!prevBaseRef) {
      console.warn(`⚠️ Neither tag v${prevBaseSemver} nor branch release/${prevBaseSemver} exists. Skipping to avoid false alarms.`);
      return;
    }
    console.log(`   Using base: ${prevBaseRef}`);

    // Guard head branch. Note: if release/X.Y.0 has been merged and deleted after the
    // release window, this check will skip silently. The cross-minor check depends on
    // the branch being kept open until the next minor is cut (standard for our workflow).
    if (!(await refExists(newBranch, ghToken))) {
      console.warn(`⚠️ Head branch ${newBranch} does not exist. Skipping to avoid false alarms.`);
      return;
    }

    // Find hotfixes on the previous minor line
    console.log(`\n📋 Looking for hotfixes on the v${prevBaseSemver} line…`);
    const hotfixVersions = await findHotfixVersions(prev.major, prev.minor, ghToken);
    if (hotfixVersions.length === 0) {
      console.log(`✅ No hotfixes found for v${prevBaseSemver}. Nothing to check.`);
      return;
    }
    console.log(`   Found ${hotfixVersions.length} hotfix(es): ${hotfixVersions.map((v) => `v${v}`).join(', ')}`);

    // Fetch new release commit titles — guard against compare failures
    console.log(`\n📦 Fetching commits in ${newBranch} ahead of ${prevBaseRef}…`);
    const { ok: titlesOk, titles: newReleaseTitles } = await getNewReleaseTitles(prevBaseRef, newBranch, ghToken);
    if (!titlesOk) {
      console.warn(`⚠️ Could not fetch commits for ${newBranch}. Skipping to avoid false alarms.`);
      return;
    }
    console.log(`   Found ${newReleaseTitles.size} distinct commit title(s) in the new release.`);

    /** @type {Map<string, { sha: string; title: string; url: string }[]>} */
    const missingByHotfix = new Map();
    /** @type {Map<string, string>} */
    const unverifiedHotfixes = new Map();
    await checkHotfixCommits(hotfixVersions, prevBaseRef, newReleaseTitles, newBranch, ghToken, missingByHotfix, unverifiedHotfixes);

    await postAlert({
      newSemver: semverLabel,
      prevSemver: prevBaseSemver,
      hotfixVersions,
      missingByHotfix,
      unverifiedHotfixes,
      workflowUrl,
      channel: process.env.SLACK_CHANNEL || deriveSlackChannel(semverLabel),
      slackToken,
      isDryRun,
    });
    return;
  }

  // -------------------------------------------------------------------------
  // MODE B — hotfix / OTA release (patch > 0)
  //   Check the preceding patches on the same minor line.
  //   e.g. release/7.79.2 → check v7.79.1
  //        release/7.79.2-ota → same
  // -------------------------------------------------------------------------
  const minorBaseSemver = `${parsed.major}.${parsed.minor}.0`;

  console.log(`\n🔍 Hotfix backport check — hotfix mode`);
  console.log(`   New hotfix  : v${semverLabel} (branch ${newBranch})`);
  console.log(`   Checking    : previous patches on the v${minorBaseSemver} line`);

  // Resolve base ref for this minor line
  console.log(`\n🔗 Resolving base ref for v${minorBaseSemver}…`);
  const minorBaseRef = await resolveBaseRef(parsed.major, parsed.minor, ghToken);
  if (!minorBaseRef) {
    console.warn(`⚠️ Neither tag v${minorBaseSemver} nor branch release/${minorBaseSemver} exists. Skipping to avoid false alarms.`);
    return;
  }
  console.log(`   Using base: ${minorBaseRef}`);

  // Guard head branch
  if (!(await refExists(newBranch, ghToken))) {
    console.warn(`⚠️ Head branch ${newBranch} does not exist. Skipping to avoid false alarms.`);
    return;
  }

  // Find all patches strictly below the new patch on the same minor line
  console.log(`\n📋 Looking for previous patches on the v${minorBaseSemver} line (patch < ${parsed.patch})…`);
  const prevPatches = await findHotfixVersions(
    parsed.major, parsed.minor, ghToken,
    { maxPatch: parsed.patch },
  );
  if (prevPatches.length === 0) {
    console.log(`✅ No previous patches found for v${minorBaseSemver}. Nothing to check.`);
    return;
  }
  console.log(`   Found ${prevPatches.length} previous patch(es): ${prevPatches.map((v) => `v${v}`).join(', ')}`);

  // Fetch new hotfix commit titles — guard against compare failures
  console.log(`\n📦 Fetching commits in ${newBranch} ahead of ${minorBaseRef}…`);
  const { ok: titlesOk, titles: newReleaseTitles } = await getNewReleaseTitles(minorBaseRef, newBranch, ghToken);
  if (!titlesOk) {
    console.warn(`⚠️ Could not fetch commits for ${newBranch}. Skipping to avoid false alarms.`);
    return;
  }
  console.log(`   Found ${newReleaseTitles.size} distinct commit title(s) in the new hotfix branch.`);

  /** @type {Map<string, { sha: string; title: string; url: string }[]>} */
  const missingByHotfix = new Map();
  /** @type {Map<string, string>} */
  const unverifiedHotfixes = new Map();
  await checkHotfixCommits(prevPatches, minorBaseRef, newReleaseTitles, newBranch, ghToken, missingByHotfix, unverifiedHotfixes);

  const prevSemverLabel = prevPatches[prevPatches.length - 1];

  await postAlert({
    newSemver: semverLabel,
    prevSemver: prevSemverLabel,
    hotfixVersions: prevPatches,
    missingByHotfix,
    unverifiedHotfixes,
    workflowUrl,
    channel: process.env.SLACK_CHANNEL || deriveSlackChannel(semverLabel),
    slackToken,
    isDryRun,
  });
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

  if (isDryRun) console.log('🧪 DRY RUN — will not post to Slack');

  // After the guard above, both are guaranteed to be non-empty strings.
  const token = /** @type {string} */ (ghToken);
  const ctx = { ghToken: token, slackToken, isDryRun, workflowUrl };

  // --- Manual run: check the explicitly specified release ------------------
  const overrideSemver = process.env.NEW_SEMVER?.trim() || '';
  if (overrideSemver) {
    const overrideIsOta = process.env.IS_OTA === 'true';
    await runCheckForRelease(overrideSemver, overrideIsOta, ctx);
    return;
  }

  // --- Scheduled run: auto-detect latest release and run BOTH checks -------
  // 1. Mode A on X.Y.0 — did prior-minor hotfixes land in the new minor?
  // 2. Mode B on X.Y.Z (patch > 0) — are prior patches present in the latest hotfix?
  console.log('ℹ️ NEW_SEMVER not set — auto-detecting latest release branch…');
  const latest = await findLatestReleaseBranch(token);
  if (!latest) {
    console.warn('⚠️ No release/* branches found. Nothing to check.');
    process.exit(0);
  }
  console.log(`   Detected: release/${latest.semver}${latest.isOta ? '-ota' : ''}`);

  // Always check cross-minor backports against the current minor's base
  const minorBase = `${latest.parsed.major}.${latest.parsed.minor}.0`;
  await runCheckForRelease(minorBase, false, ctx);

  // If a patch exists on this line, also check hotfix-on-hotfix backports
  if (latest.parsed.patch > 0) {
    await runCheckForRelease(latest.semver, latest.isOta, ctx);
  }
}

main().catch((err) => {
  console.error('⚠️ Unexpected error (non-critical):', err);
  // Fail open — a notification failure should not break the release pipeline.
});
