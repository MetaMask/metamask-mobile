import fs from 'node:fs';

/**
 * Fail-closed gate for the ci.yml aggregate check on one commit.
 *
 * Production OTA publishes a pull request head SHA. This module allows that
 * publish only when the latest ci.yml "Check all jobs pass" job on that exact
 * SHA completed with conclusion success. A missing job, a job still in
 * progress, a job on any other SHA, a same-named job from another workflow,
 * or any other conclusion blocks.
 *
 * The OTA gate jobs must not use this check name. A top-level Actions job
 * records a check run under its own name, so a gate named "Check all jobs
 * pass" would be the newest run on the shipped SHA and would either block
 * (while in progress) or satisfy a later production gate (when a non-production
 * run succeeds).
 */

export const CHECK_ALL_JOBS_PASS_NAME = 'Check all jobs pass';

/** Workflow file whose aggregate job is the only accepted CI result. */
export const CI_WORKFLOW_PATH = '.github/workflows/ci.yml';

const CI_WORKFLOW_FILE = 'ci.yml';
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
  /** Workflow file that created the check. Required for a pass. */
  workflow_path?: string | null;
  /**
   * Start of the ci.yml workflow run. Latest-run ordering uses this, not the
   * aggregate job's own start, because that job starts near the end of CI.
   */
  run_started_at?: string | null;
  /** Higher attempt is the newer run when two runs share a start time. */
  run_attempt?: number | null;
  /** Workflow run id. Tie-break after run_attempt. */
  run_id?: number | null;
}

export interface WorkflowRunRef {
  id?: number;
  path?: string | null;
  head_sha?: string | null;
  status?: string | null;
  conclusion?: string | null;
  run_started_at?: string | null;
  created_at?: string | null;
  run_attempt?: number | null;
  html_url?: string | null;
}

export interface WorkflowJobRef {
  id?: number;
  name?: string;
  status?: string | null;
  conclusion?: string | null;
  head_sha?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  html_url?: string | null;
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
 * tip. Runs that are not the ci.yml aggregate are ignored too, including a
 * same-named job from the OTA gate itself. Among the remaining runs, the
 * latest workflow run must be a completed success from GitHub Actions.
 * Ordering is the workflow run's start, then its attempt and id. An older
 * success does not override a newer in-progress or failed ci.yml run, even
 * when the runs overlap and the older aggregate job started later.
 *
 * @param runs - Candidate check runs. Only ci.yml aggregates are considered.
 * @param expectedSha - Full commit SHA that will be published.
 * @param checkName - Job name. Defaults to the ci.yml aggregate job.
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
    if (run.workflow_path !== CI_WORKFLOW_PATH) {
      return false;
    }
    return (run.head_sha ?? '').toLowerCase() === sha;
  });

  if (onThisSha.length === 0) {
    return {
      ok: false,
      reason: `no ci.yml "${checkName}" check run on ${sha}; production OTA is blocked`,
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
    reason: `ci.yml "${checkName}" succeeded on ${sha}`,
    htmlUrl,
  };
}

/**
 * Turn ci.yml workflow runs and their jobs into aggregate check runs.
 *
 * A run that matches the SHA and workflow path but has no aggregate job yet
 * still produces a record, so a newer in-progress ci.yml run blocks an older
 * success. A completed run with no aggregate job is a failure. Jobs from any
 * other workflow are not represented here.
 *
 * @param workflowRuns - Runs from the Actions API, or a fixture.
 * @param jobsByRunId - Jobs for those runs, keyed by workflow run id.
 * @param expectedSha - Full commit SHA that will be published.
 * @param checkName - Aggregate job name.
 * @returns Check runs the gate can evaluate. Each has `workflow_path` set.
 */
export function collectCiAggregateChecks(
  workflowRuns: WorkflowRunRef[],
  jobsByRunId: Readonly<Record<string, WorkflowJobRef[] | undefined>>,
  expectedSha: string,
  checkName: string = CHECK_ALL_JOBS_PASS_NAME,
): CheckRunRef[] {
  const sha = expectedSha.trim().toLowerCase();
  const collected: CheckRunRef[] = [];

  for (const workflowRun of workflowRuns) {
    if (workflowRun.path !== CI_WORKFLOW_PATH) {
      continue;
    }
    if ((workflowRun.head_sha ?? '').toLowerCase() !== sha) {
      continue;
    }

    const jobs = jobsByRunId[String(workflowRun.id ?? '')] ?? [];
    const aggregates = jobs.filter((job) => {
      if (job.name !== checkName) {
        return false;
      }
      return (job.head_sha ?? '').toLowerCase() === sha;
    });

    if (aggregates.length === 0) {
      collected.push(missingAggregate(workflowRun, sha, checkName));
      continue;
    }

    for (const job of aggregates) {
      collected.push({
        id: job.id,
        name: checkName,
        status: job.status,
        conclusion: job.conclusion,
        head_sha: sha,
        // GitHub stamps a queued job with year 1. That is unset, so keep the
        // workflow run time. Ordering itself uses the workflow run, below.
        started_at:
          realTimestamp(job.started_at) ??
          realTimestamp(workflowRun.run_started_at) ??
          realTimestamp(workflowRun.created_at),
        completed_at: job.completed_at,
        html_url: job.html_url,
        app: { slug: GITHUB_ACTIONS_SLUG },
        workflow_path: CI_WORKFLOW_PATH,
        run_started_at:
          realTimestamp(workflowRun.run_started_at) ??
          realTimestamp(workflowRun.created_at),
        run_attempt: workflowRun.run_attempt ?? null,
        run_id: workflowRun.id ?? null,
      });
    }
  }

  return collected;
}

/**
 * Fetch ci.yml runs for one SHA and return only that workflow's aggregate jobs.
 * Throws when the API does not return a complete list.
 *
 * Listing by workflow file, not by check name, keeps a same-named job from
 * runway-ota-production.yml or push-eas-update.yml out of the result.
 *
 * @param repository - `owner/repo`.
 * @param sha - Commit SHA.
 * @param token - Token with `actions: read`.
 * @param checkName - Exact aggregate job name inside ci.yml.
 * @returns Aggregate jobs, plus a blocking record for a ci.yml run that has none.
 */
export async function listCheckRunsForSha(
  repository: string,
  sha: string,
  token: string,
  checkName: string,
): Promise<CheckRunRef[]> {
  if (!/^[^/\s]+\/[^/\s]+$/.test(repository)) {
    throw new Error('GITHUB_REPOSITORY must be owner/repo');
  }

  const workflowRuns = await listPages(token, (page) => {
    const url = new URL(
      `https://api.github.com/repos/${repository}/actions/workflows/${CI_WORKFLOW_FILE}/runs`,
    );
    url.searchParams.set('head_sha', sha);
    url.searchParams.set('per_page', '100');
    url.searchParams.set('page', String(page));
    return url;
  }, readWorkflowRuns);

  const jobsByRunId: Record<string, WorkflowJobRef[]> = {};
  for (const workflowRun of workflowRuns) {
    if (workflowRun.path !== CI_WORKFLOW_PATH) {
      continue;
    }
    if ((workflowRun.head_sha ?? '').toLowerCase() !== sha.toLowerCase()) {
      continue;
    }
    if (workflowRun.id === undefined) {
      throw new Error(`ci.yml run for ${sha} is missing an id`);
    }
    const runId = workflowRun.id;
    jobsByRunId[String(runId)] = await listPages(token, (page) => {
      const url = new URL(
        `https://api.github.com/repos/${repository}/actions/runs/${runId}/jobs`,
      );
      url.searchParams.set('filter', 'latest');
      url.searchParams.set('per_page', '100');
      url.searchParams.set('page', String(page));
      return url;
    }, readWorkflowJobs);
  }

  return collectCiAggregateChecks(workflowRuns, jobsByRunId, sha, checkName);
}

function missingAggregate(
  workflowRun: WorkflowRunRef,
  sha: string,
  checkName: string,
): CheckRunRef {
  const completed = workflowRun.status === 'completed';
  const startedAt =
    realTimestamp(workflowRun.run_started_at) ??
    realTimestamp(workflowRun.created_at);
  return {
    id: workflowRun.id,
    name: checkName,
    status: completed ? 'completed' : (workflowRun.status ?? 'in_progress'),
    conclusion: completed ? 'missing' : null,
    head_sha: sha,
    started_at: startedAt,
    completed_at: completed ? startedAt : null,
    html_url: workflowRun.html_url,
    app: { slug: GITHUB_ACTIONS_SLUG },
    workflow_path: CI_WORKFLOW_PATH,
    run_started_at: startedAt,
    run_attempt: workflowRun.run_attempt ?? null,
    run_id: workflowRun.id ?? null,
  };
}

function pickLatest(runs: CheckRunRef[]): CheckRunRef {
  return [...runs].sort((left, right) => {
    const byRunStart = timestamp(right.run_started_at) - timestamp(left.run_started_at);
    if (byRunStart !== 0) {
      return byRunStart;
    }
    const byAttempt = (right.run_attempt ?? 0) - (left.run_attempt ?? 0);
    if (byAttempt !== 0) {
      return byAttempt;
    }
    const byRunId = (right.run_id ?? 0) - (left.run_id ?? 0);
    if (byRunId !== 0) {
      return byRunId;
    }
    // Check fixtures that are not workflow runs still order by job time.
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

/** GitHub uses year 1 when a queued job has not actually started. */
function realTimestamp(value: string | null | undefined): string | null {
  if (!value || value.startsWith('0001-')) {
    return null;
  }
  return value;
}

function timestamp(value: string | null | undefined): number {
  const real = realTimestamp(value);
  if (!real) {
    return 0;
  }
  const parsed = Date.parse(real);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function isRecord(value: unknown): value is CheckRunRef & {
  check_runs?: unknown;
  total_count?: unknown;
  workflow_runs?: unknown;
  jobs?: unknown;
} {
  return typeof value === 'object' && value !== null;
}

async function listPages<T>(
  token: string,
  buildUrl: (page: number) => URL,
  readItems: (body: unknown) => T[],
): Promise<T[]> {
  const items: T[] = [];
  let page = 1;

  for (;;) {
    const url = buildUrl(page);
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
        `GitHub request failed with HTTP ${response.status} for ${url.pathname}`,
      );
    }

    const body: unknown = await response.json();
    const batch = readItems(body);
    items.push(...batch);

    const total = isRecord(body) && typeof body.total_count === 'number'
      ? body.total_count
      : items.length;

    if (batch.length === 0 || items.length >= total) {
      if (items.length < total) {
        throw new Error(
          `GitHub returned ${items.length} of ${total} results for ${url.pathname}`,
        );
      }
      return items;
    }

    page += 1;
    if (page > 20) {
      throw new Error(`refusing to page ${url.pathname} past 20 pages`);
    }
  }
}

function readWorkflowRuns(body: unknown): WorkflowRunRef[] {
  if (!isRecord(body) || !Array.isArray(body.workflow_runs)) {
    return [];
  }
  return body.workflow_runs.filter(isRecord);
}

function readWorkflowJobs(body: unknown): WorkflowJobRef[] {
  if (!isRecord(body) || !Array.isArray(body.jobs)) {
    return [];
  }
  return body.jobs.filter(isRecord);
}

function isWorkflowFixture(payload: unknown): payload is {
  workflow_runs: WorkflowRunRef[];
  jobs?: Record<string, WorkflowJobRef[]>;
} {
  return isRecord(payload) && Array.isArray(payload.workflow_runs);
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
    if (isWorkflowFixture(parsed)) {
      const jobs = isRecord(parsed.jobs) ? parsed.jobs : {};
      const jobsByRunId: Record<string, WorkflowJobRef[]> = {};
      for (const [runId, value] of Object.entries(jobs)) {
        jobsByRunId[runId] = readWorkflowJobs({ jobs: value });
      }
      runs = collectCiAggregateChecks(
        readWorkflowRuns({ workflow_runs: parsed.workflow_runs }),
        jobsByRunId,
        sha,
        checkName,
      );
    } else {
      runs = readCheckRuns(parsed);
    }
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
