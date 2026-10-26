import fs from 'node:fs';

/**
 * Fail-closed gate for the ci.yml aggregate check on one commit.
 *
 * Production OTA publishes a pull request head SHA. This module allows that
 * publish only when the latest "Check all jobs pass" run recorded on that
 * exact SHA completed with conclusion success. A missing run, a run still
 * in progress, a run on any other SHA, or any other conclusion blocks.
 */

export const CHECK_ALL_JOBS_PASS_NAME = 'Check all jobs pass';

const FULL_SHA = /^[0-9a-f]{40}$/;
const GITHUB_ACTIONS_SLUG = 'github-actions';

export interface CheckRunRef {
  id?: number;
  name?: string;
  status?: string | null;
  conclusion?: string | null;
  head_sha?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  html_url?: string | null;
  app?: { slug?: string | null } | null;
}

export interface GateDecision {
  ok: boolean;
  reason: string;
  htmlUrl?: string;
}

/**
 * Normalize a GitHub check-runs payload into a list.
 * Accepts the REST object `{ check_runs }` or a bare array (test fixtures).
 *
 * @param payload - Parsed JSON from the checks API or a fixture.
 * @returns Check runs, or an empty list when the payload has none.
 */
export function readCheckRuns(payload: unknown): CheckRunRef[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }
  if (isRecord(payload) && Array.isArray(payload.check_runs)) {
    return payload.check_runs.filter(isRecord);
  }
  return [];
}

/**
 * Decide whether `expectedSha` may be published.
 *
 * Runs whose `head_sha` is not `expectedSha` are ignored, so a pull_request
 * check attached to a merge commit cannot satisfy the gate for the branch
 * tip. Among the remaining runs, the latest one must be a completed success
 * from GitHub Actions. An older success does not override a newer in-progress
 * or failed run on the same SHA.
 *
 * @param runs - Check runs named "Check all jobs pass", or a wider list.
 * @param expectedSha - Full commit SHA that will be published.
 * @param checkName - Check run name. Defaults to the ci.yml aggregate job.
 * @returns A pass/fail decision. `ok` is false for every uncertain case.
 */
export function evaluateCheckAllJobsPass(
  runs: CheckRunRef[],
  expectedSha: string,
  checkName: string = CHECK_ALL_JOBS_PASS_NAME,
): GateDecision {
  const sha = expectedSha.trim().toLowerCase();
  if (!FULL_SHA.test(sha)) {
    return {
      ok: false,
      reason: `refusing to publish without a full 40-character commit SHA (got "${expectedSha}")`,
    };
  }

  const onThisSha = runs.filter((run) => {
    if (run.name !== checkName) {
      return false;
    }
    return (run.head_sha ?? '').toLowerCase() === sha;
  });

  if (onThisSha.length === 0) {
    return {
      ok: false,
      reason: `no "${checkName}" check run on ${sha}; production OTA is blocked`,
    };
  }

  const latest = pickLatest(onThisSha);
  const htmlUrl = latest.html_url ?? undefined;

  if ((latest.app?.slug ?? '') !== GITHUB_ACTIONS_SLUG) {
    return {
      ok: false,
      reason: `"${checkName}" on ${sha} was not created by GitHub Actions`,
      htmlUrl,
    };
  }

  if (latest.status !== 'completed') {
    return {
      ok: false,
      reason: `"${checkName}" on ${sha} is ${latest.status ?? 'missing a status'}; wait for CI to finish`,
      htmlUrl,
    };
  }

  if (latest.conclusion !== 'success') {
    return {
      ok: false,
      reason: `"${checkName}" on ${sha} finished with conclusion ${latest.conclusion ?? 'empty'}`,
      htmlUrl,
    };
  }

  return {
    ok: true,
    reason: `"${checkName}" succeeded on ${sha}`,
    htmlUrl,
  };
}

/**
 * Fetch every page of check runs for one name.
 * Throws when the API does not return a complete list.
 *
 * @param repository - `owner/repo`.
 * @param sha - Commit SHA.
 * @param token - Token with `checks: read`.
 * @param checkName - Exact check run name.
 * @returns All matching check runs.
 */
export async function listCheckRunsForSha(
  repository: string,
  sha: string,
  token: string,
  checkName: string,
): Promise<CheckRunRef[]> {
  const runs: CheckRunRef[] = [];
  let page = 1;

  for (;;) {
    const url = new URL(
      `https://api.github.com/repos/${repository}/commits/${sha}/check-runs`,
    );
    url.searchParams.set('check_name', checkName);
    url.searchParams.set('per_page', '100');
    url.searchParams.set('page', String(page));

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'metamask-mobile-ota-ci-gate',
      },
    });

    if (!response.ok) {
      throw new Error(
        `GitHub check-runs request failed with HTTP ${response.status} for ${sha}`,
      );
    }

    const body: unknown = await response.json();
    const batch = readCheckRuns(body);
    runs.push(...batch);

    const total = isRecord(body) && typeof body.total_count === 'number'
      ? body.total_count
      : runs.length;

    if (batch.length === 0 || runs.length >= total) {
      if (runs.length < total) {
        throw new Error(
          `GitHub returned ${runs.length} of ${total} check runs for ${sha}`,
        );
      }
      return runs;
    }

    page += 1;
    if (page > 20) {
      throw new Error(`refusing to page check runs for ${sha} past 20 pages`);
    }
  }
}

function pickLatest(runs: CheckRunRef[]): CheckRunRef {
  return [...runs].sort((left, right) => {
    const byStart = timestamp(right.started_at) - timestamp(left.started_at);
    if (byStart !== 0) {
      return byStart;
    }
    const byComplete =
      timestamp(right.completed_at) - timestamp(left.completed_at);
    if (byComplete !== 0) {
      return byComplete;
    }
    return (right.id ?? 0) - (left.id ?? 0);
  })[0];
}

function timestamp(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function isRecord(value: unknown): value is CheckRunRef & {
  check_runs?: unknown;
  total_count?: unknown;
} {
  return typeof value === 'object' && value !== null;
}

async function main(): Promise<void> {
  const sha = process.env.COMMIT_SHA ?? '';
  const checkName = process.env.CHECK_NAME || CHECK_ALL_JOBS_PASS_NAME;
  const fixture = process.env.CHECK_RUNS_JSON;

  let runs: CheckRunRef[];
  if (fixture !== undefined) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(fixture);
    } catch {
      report(false, 'CHECK_RUNS_JSON is not valid JSON');
      return;
    }
    runs = readCheckRuns(parsed);
  } else {
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '';
    const repository = process.env.GITHUB_REPOSITORY ?? '';
    if (!token || !repository) {
      report(
        false,
        'GITHUB_TOKEN and GITHUB_REPOSITORY are required to read CI results',
      );
      return;
    }
    try {
      runs = await listCheckRunsForSha(repository, sha, token, checkName);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'check run lookup failed';
      report(false, message);
      return;
    }
  }

  const decision = evaluateCheckAllJobsPass(runs, sha, checkName);
  report(decision.ok, decision.reason, decision.htmlUrl);
}

function report(ok: boolean, reason: string, htmlUrl?: string): void {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  const line = htmlUrl ? `${reason} (${htmlUrl})` : reason;
  if (summaryPath) {
    const heading = ok
      ? '### Check all jobs pass'
      : '### Production OTA blocked';
    fs.appendFileSync(summaryPath, `${heading}\n\n${line}\n`);
  }
  finish(ok, line);
}

function finish(ok: boolean, line: string): void {
  if (ok) {
    process.stdout.write(`${line}\n`);
    process.exit(0);
  }
  process.stderr.write(`::error::${line}\n`);
  process.exit(1);
}

const invokedPath = process.argv[1] ?? '';
if (invokedPath.endsWith('require-check-all-jobs-pass.mts')) {
  void main();
}
