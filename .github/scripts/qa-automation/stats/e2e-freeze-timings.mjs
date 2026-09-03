#!/usr/bin/env node

/**
 * Fetches E2E test timing data and writes it to a file so it can be uploaded
 * as a run-scoped artifact and reused by every shard (including re-runs).
 *
 * Timing source priority:
 *   1. qa-stats artifact from the merge-base commit of the PR branch and main
 *      (most accurate: not affected by test renames/additions on main after branching)
 *   2. qa-stats artifact from the latest successful main run (current fallback)
 *   3. null → callers fall back to alphabetical equal-count split
 *
 * Outputs:
 *   - Writes e2e-timings.json to OUTPUT_PATH (default: ./e2e-timings.json)
 *   - Sets GITHUB_OUTPUT available=true|false
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const REPOSITORY = process.env.REPOSITORY || 'MetaMask/metamask-mobile';
const PR_NUMBER = process.env.PR_NUMBER || '';
const OUTPUT_PATH = process.env.OUTPUT_PATH || './e2e-timings.json';

const QA_STATS_WORKFLOW_FILE = 'qa-stats.yml';
const QA_STATS_ARTIFACT_NAME = 'qa-stats';
const QA_STATS_JSON_FILENAME = 'qa-stats.json';

const [OWNER, REPO] = REPOSITORY.split('/');
const API_BASE = `https://api.github.com/repos/${REPOSITORY}`;

/**
 * Minimal GitHub REST helper.
 * @param {string} url
 * @returns {Promise<any>}
 */
async function githubRest(url) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'metamask-mobile-ci',
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    const suffix = body ? `: ${body.slice(0, 200)}` : '';
    throw new Error(`GET ${url} → ${res.status} ${res.statusText}${suffix}`);
  }
  return res.json();
}

/**
 * Download and extract qa-stats.json from a GitHub Actions run artifact.
 * Returns the e2e_test_times map, or null on any failure.
 * @param {number} runId
 * @returns {Promise<object|null>}
 */
async function extractTimingsFromRun(runId) {
  const artifactsData = await githubRest(`${API_BASE}/actions/runs/${runId}/artifacts`);
  const artifact = (artifactsData?.artifacts || []).find(
    (a) => a?.name === QA_STATS_ARTIFACT_NAME && !a?.expired,
  );
  if (!artifact?.archive_download_url) {
    return null;
  }

  // GitHub redirects to a pre-signed storage URL. Follow manually so the
  // Authorization header is not forwarded (storage rejects it).
  const redirectRes = await fetch(artifact.archive_download_url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'metamask-mobile-ci',
    },
    redirect: 'manual',
  });
  const downloadUrl = redirectRes.headers.get('location');
  if (!downloadUrl) {
    throw new Error(`no redirect URL for artifact on run #${runId} (status ${redirectRes.status})`);
  }

  const zipRes = await fetch(downloadUrl);
  if (!zipRes.ok) {
    throw new Error(`download zip → ${zipRes.status} ${zipRes.statusText}`);
  }

  // Reject unexpectedly large responses before writing to disk.
  const MAX_ZIP_BYTES = 50 * 1024 * 1024; // 50 MB
  const contentLength = Number(zipRes.headers.get('content-length') ?? 0);
  if (contentLength > MAX_ZIP_BYTES) {
    throw new Error(`artifact zip too large (${contentLength} bytes) — aborting`);
  }

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), `qa-stats-${runId}-`));
  const zipPath = path.join(tmpRoot, 'qa-stats.zip');
  fs.writeFileSync(zipPath, Buffer.from(await zipRes.arrayBuffer()));

  const unzipResult = spawnSync('unzip', ['-o', zipPath, '-d', tmpRoot], { stdio: 'pipe' });
  if (unzipResult.status !== 0) {
    throw new Error(`unzip failed (code ${unzipResult.status}): ${unzipResult.stderr?.toString() || ''}`);
  }

  const jsonPath = path.join(tmpRoot, QA_STATS_JSON_FILENAME);
  if (!fs.existsSync(jsonPath)) return null;

  const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const times = parsed?.e2e_test_times;
  if (!times || typeof times !== 'object' || Object.keys(times).length === 0) return null;

  return times;
}

/**
 * Resolve the merge-base SHA for the current PR branch against main using
 * the GitHub compare API. Returns null when unavailable.
 * @returns {Promise<string|null>}
 */
async function getMergeBaseSha() {
  if (!PR_NUMBER) return null;
  try {
    const pr = await githubRest(`${API_BASE}/pulls/${PR_NUMBER}`);
    const headSha = pr?.head?.sha;
    if (!headSha) return null;

    const compare = await githubRest(
      `${API_BASE}/compare/main...${headSha}`,
    );
    return compare?.merge_base_commit?.sha || null;
  } catch (e) {
    console.log(`ℹ️  Could not resolve merge-base SHA: ${e?.message || e}`);
    return null;
  }
}

/**
 * Fetch timings from the qa-stats artifact produced for a specific commit SHA.
 * Returns null if no matching run or artifact is found.
 * @param {string} sha
 * @returns {Promise<object|null>}
 */
async function fetchTimingsForSha(sha) {
  const runsData = await githubRest(
    `${API_BASE}/actions/workflows/${QA_STATS_WORKFLOW_FILE}/runs?head_sha=${sha}&status=success&per_page=1`,
  );
  const run = runsData?.workflow_runs?.[0];
  if (!run?.id) return null;

  console.log(`📥 Fetching qa-stats artifact from merge-base run #${run.id} (sha: ${sha.slice(0, 8)})`);
  return extractTimingsFromRun(run.id);
}

/**
 * Fetch timings from the latest successful qa-stats run on main.
 * @returns {Promise<object|null>}
 */
async function fetchLatestMainTimings() {
  const runsData = await githubRest(
    `${API_BASE}/actions/workflows/${QA_STATS_WORKFLOW_FILE}/runs?branch=main&status=success&per_page=1`,
  );
  const run = runsData?.workflow_runs?.[0];
  if (!run?.id) return null;

  console.log(`📥 Fetching qa-stats artifact from latest main run #${run.id}`);
  return extractTimingsFromRun(run.id);
}

/**
 * Write a value to GITHUB_OUTPUT if available.
 * @param {string} name
 * @param {string} value
 */
function setOutput(name, value) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    fs.appendFileSync(outputFile, `${name}=${value}\n`);
  }
}

async function main() {
  if (!GITHUB_TOKEN) {
    console.log('ℹ️  No GITHUB_TOKEN — skipping timings fetch');
    setOutput('available', 'false');
    return;
  }

  let times = null;

  // 1. Try merge-base timings (most stable and accurate for PRs)
  try {
    const mergeBaseSha = await getMergeBaseSha();
    if (mergeBaseSha) {
      console.log(`🔍 Resolved merge-base SHA: ${mergeBaseSha.slice(0, 8)}`);
      times = await fetchTimingsForSha(mergeBaseSha);
      if (times) {
        console.log(`✅ Using merge-base timings (${Object.keys(times).length} entries)`);
      } else {
        console.log('ℹ️  No qa-stats artifact found for merge-base — trying latest main');
      }
    } else {
      console.log('ℹ️  No merge-base SHA (non-PR run) — trying latest main');
    }
  } catch (e) {
    console.log(`ℹ️  Merge-base timings fetch failed (${e?.message || e}) — trying latest main`);
  }

  // 2. Fall back to latest successful main run
  if (!times) {
    try {
      times = await fetchLatestMainTimings();
      if (times) {
        console.log(`✅ Using latest-main timings (${Object.keys(times).length} entries)`);
      } else {
        console.log('ℹ️  No qa-stats artifact on latest main run');
      }
    } catch (e) {
      console.log(`ℹ️  Latest-main timings fetch failed: ${e?.message || e}`);
    }
  }

  if (!times) {
    console.log('ℹ️  No timings available — shards will use alphabetical equal-count split');
    setOutput('available', 'false');
    return;
  }

  const outputDir = path.dirname(path.resolve(OUTPUT_PATH));
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify({ e2e_test_times: times }, null, 2));
  console.log(`💾 Wrote timings to ${OUTPUT_PATH}`);
  setOutput('available', 'true');
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err);
  setOutput('available', 'false');
  // Exit 0 — timings are best-effort; failure here must never block E2E jobs.
  process.exit(0);
});
