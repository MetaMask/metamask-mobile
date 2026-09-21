/**
 * Same-SHA unit-test fail-then-pass detection.
 *
 * A later commit can change production code or Jest setup and make a test
 * pass, so only an identical head SHA is a "no fix landed" signal. GitHub
 * Re-run jobs (attempt 1 → 2 on one run id) and a second ci.yml run on that
 * commit are both valid; fail on SHA A then pass on SHA B is not.
 *
 * Stage 1 walks an ID-first funnel: list runs, keep SHAs that can be a
 * retry, GraphQL-batch failed Unit tests check runs, confirm the same job
 * name later succeeded, then download logs only for those jobs.
 */
import type { CoverageWindow, UnattributedRerun } from './flaky-types';

export type { CoverageWindow, UnattributedRerun };

export const UNIT_TEST_JOB_PREFIX = 'Unit tests';
export const CI_WORKFLOW_NAME = 'ci';

export type ListedWorkflowRun = {
  id: number;
  conclusion: string | null;
  createdAt: string;
  headSha: string;
  runAttempt: number;
};

export type WorkflowRunListItem = {
  id: number;
  conclusion: string | null;
  created_at: string;
  head_sha: string;
  run_attempt?: number;
};

export function listedWorkflowRunFromApi(
  run: WorkflowRunListItem,
): ListedWorkflowRun {
  return {
    id: run.id,
    conclusion: run.conclusion,
    createdAt: run.created_at,
    headSha: run.head_sha,
    // Octokit types run_attempt as optional; a missing value is the first attempt.
    runAttempt: run.run_attempt ?? 1,
  };
}

export type ListedRunsPage = {
  data: WorkflowRunListItem[];
};

/**
 * `listWorkflowRuns` stops returning results past 1000 per query whatever
 * `per_page` and `page` say, so a single 14-day query silently collapses to
 * the newest ~3 days on a repo at this run volume. One query per day keeps
 * each bucket under that ceiling.
 */
export function lookbackDayBuckets(now: Date, lookbackDays: number): string[] {
  const days: string[] = [];
  for (let offset = 0; offset < Math.max(0, lookbackDays); offset += 1) {
    const day = new Date(now.getTime() - offset * 24 * 60 * 60 * 1000);
    days.push(day.toISOString().slice(0, 10));
  }
  return days;
}

export function summarizeCoverageWindow({
  runs,
  lookbackDays,
  cappedDays,
}: {
  runs: ListedWorkflowRun[];
  lookbackDays: number;
  cappedDays: string[];
}): CoverageWindow {
  const timestamps = runs
    .map((run) => run.createdAt)
    .filter((createdAt) => createdAt.length > 0)
    .sort();
  return {
    lookbackDays,
    runsListed: runs.length,
    oldestRunSampled: timestamps[0]?.slice(0, 10) ?? '',
    newestRunSampled: timestamps[timestamps.length - 1]?.slice(0, 10) ?? '',
    cappedDays,
  };
}

export type CollectListedRunsFromPagesResult = {
  runs: ListedWorkflowRun[];
  pageErrorMessage?: string;
};

/**
 * Walks listWorkflowRuns pages. A later-page failure keeps already-listed
 * runs so Stage 1 can still sample instead of failing the job on a mid-walk
 * 429/5xx after `withRetryOnce` restarted from page 1.
 */
export async function collectListedRunsFromPages(
  pages: AsyncIterable<ListedRunsPage>,
  maxRuns: number,
): Promise<CollectListedRunsFromPagesResult> {
  const runs: ListedWorkflowRun[] = [];
  try {
    for await (const { data } of pages) {
      for (const run of data) {
        runs.push(listedWorkflowRunFromApi(run));
        if (runs.length >= maxRuns) {
          return { runs };
        }
      }
    }
  } catch (error) {
    if (runs.length === 0) {
      throw error;
    }
    return {
      runs,
      pageErrorMessage: (error as Error).message,
    };
  }
  return { runs };
}

export type SameShaFileHit = {
  count: number;
  exampleRunUrl: string;
};

export type SameShaLogHit = {
  path: string;
  failRunId: number;
  jobId: number;
};

/** GitHub job log page — `/actions/runs/{runId}/job/{jobId}`, not the workflow-run summary. */
export function jobLogUrl(
  serverUrl: string,
  repo: string,
  runId: number,
  jobId: number,
): string {
  return `${serverUrl}/${repo}/actions/runs/${runId}/job/${jobId}`;
}

export type FailedUnitCheckRun = {
  name: string;
  jobId: number;
  runId: number;
  runAttempt: number;
  suiteOrder: number;
};

export type CiSuite = {
  suiteOrder: number;
  runId: number;
  runAttempt: number;
  failedUnit: FailedUnitCheckRun[];
  passedUnitNames: string[];
};

export type ShaCheckResult = {
  headSha: string;
  suites: CiSuite[];
  /** A connection returned fewer nodes than its totalCount, so a suite or check run is missing. */
  truncated: boolean;
};

export type ConfirmedFailThenPassJob = {
  name: string;
  jobId: number;
  runId: number;
};

export type ShaBatchQuery = {
  query: string;
  variables: Record<string, string>;
};

export function groupRunsByHeadSha(
  runs: ListedWorkflowRun[],
): Map<string, ListedWorkflowRun[]> {
  const groups = new Map<string, ListedWorkflowRun[]>();
  for (const run of runs) {
    if (!run.headSha) {
      continue;
    }
    const list = groups.get(run.headSha) ?? [];
    list.push(run);
    groups.set(run.headSha, list);
  }
  return groups;
}

/**
 * A fail-then-pass needs both a failed Unit tests job and a second execution
 * on the identical commit. The failed job always fails its run, so a SHA with
 * no failed run cannot hold the signal — that drops re-runs of already-green
 * commits before they cost a GraphQL point each.
 *
 * A re-run that stayed red is deliberately kept: GitHub concludes the whole
 * run on every job, so "Unit tests passed, lint still failed" looks identical
 * to "nothing passed", and pruning on a missing success conclusion would drop
 * exactly the flakes this walk exists to find.
 */
export function isCandidateShaGroup(runsForSha: ListedWorkflowRun[]): boolean {
  if (!runsForSha.some((run) => run.conclusion === 'failure')) {
    return false;
  }
  if (runsForSha.some((run) => run.runAttempt > 1)) {
    return true;
  }
  const uniqueRunIds = new Set(runsForSha.map((run) => run.id));
  if (uniqueRunIds.size < 2) {
    return false;
  }
  return runsForSha.some((run) => run.conclusion === 'success');
}

export function candidateShaGroupsNewestFirst(
  groups: Map<string, ListedWorkflowRun[]>,
): { headSha: string; runs: ListedWorkflowRun[] }[] {
  const candidates = [...groups.entries()]
    .filter(([, runs]) => isCandidateShaGroup(runs))
    .map(([headSha, runs]) => ({ headSha, runs }));

  return candidates.sort((a, b) => {
    const aNewest = Math.max(...a.runs.map((run) => Date.parse(run.createdAt)));
    const bNewest = Math.max(...b.runs.map((run) => Date.parse(run.createdAt)));
    return bNewest - aNewest;
  });
}

export function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) {
    return items.length === 0 ? [] : [items];
  }
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * `appId: 15368` is the GitHub Actions app: it drops the third-party suites
 * (measured: 27 suites on a PR head, 16 of them Actions) that can never hold a
 * Unit tests job. `totalCount` next to every connection is what proves the
 * page was not truncated — guessing `first` sizes silently loses confirmations.
 */
export const GITHUB_ACTIONS_APP_ID = 15368;

const COMMIT_FIELDS = `{
  oid
  checkSuites(first: 50, filterBy: { appId: ${GITHUB_ACTIONS_APP_ID} }) {
    totalCount
    nodes {
      workflowRun {
        databaseId
        runAttempt
        workflow { name }
      }
      failed: checkRuns(first: 50, filterBy: { checkType: ALL, conclusions: [FAILURE] }) {
        totalCount
        nodes { name detailsUrl }
      }
      passed: checkRuns(first: 100, filterBy: { checkType: LATEST, conclusions: [SUCCESS] }) {
        totalCount
        nodes { name }
      }
    }
  }
}`;

export function buildShaBatchQuery(
  shas: string[],
  owner: string,
  name: string,
): ShaBatchQuery {
  const variables: Record<string, string> = { owner, name };
  const shaParams: string[] = [];
  const aliases: string[] = [];
  shas.forEach((sha, index) => {
    const alias = `c${index}`;
    const varName = `sha${index}`;
    variables[varName] = sha;
    shaParams.push(`$${varName}: GitObjectID!`);
    aliases.push(
      `${alias}: object(oid: $${varName}) { ... on Commit ${COMMIT_FIELDS} }`,
    );
  });
  const query = `query ShaBatch($owner: String!, $name: String!, ${shaParams.join(', ')}) {
  repository(owner: $owner, name: $name) {
    ${aliases.join('\n    ')}
  }
}`;
  return { query, variables };
}

const JOB_URL_PATTERN = /\/runs\/(\d+)\/job\/(\d+)(?:\/|$)/;

export function jobIdFromDetailsUrl(
  detailsUrl: string,
): { runId: number; jobId: number } | null {
  const match = JOB_URL_PATTERN.exec(detailsUrl);
  if (!match) {
    return null;
  }
  return { runId: Number(match[1]), jobId: Number(match[2]) };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** True when a connection returned fewer nodes than it says exist. */
function connectionTruncated(connection: unknown): boolean {
  if (!isRecord(connection)) {
    return false;
  }
  const total = asNumber(connection.totalCount);
  if (total === null) {
    return false;
  }
  return asArray(connection.nodes).length < total;
}

function parseSuite(node: unknown): CiSuite | null {
  if (!isRecord(node)) {
    return null;
  }
  const workflowRun = node.workflowRun;
  if (!isRecord(workflowRun)) {
    return null;
  }
  const workflow = workflowRun.workflow;
  const workflowName = isRecord(workflow) ? asString(workflow.name) : '';
  if (workflowName.toLowerCase() !== CI_WORKFLOW_NAME) {
    return null;
  }
  const suiteOrder = asNumber(workflowRun.databaseId);
  const runAttempt = asNumber(workflowRun.runAttempt) ?? 1;
  if (suiteOrder === null) {
    return null;
  }

  const failedUnit: FailedUnitCheckRun[] = [];
  const failedNodes = isRecord(node.failed) ? asArray(node.failed.nodes) : [];
  for (const failed of failedNodes) {
    if (!isRecord(failed)) {
      continue;
    }
    const checkName = asString(failed.name);
    if (!checkName.startsWith(UNIT_TEST_JOB_PREFIX)) {
      continue;
    }
    const ids = jobIdFromDetailsUrl(asString(failed.detailsUrl));
    if (!ids) {
      continue;
    }
    failedUnit.push({
      name: checkName,
      jobId: ids.jobId,
      runId: ids.runId,
      runAttempt,
      suiteOrder,
    });
  }

  const passedUnitNames: string[] = [];
  const passedNodes = isRecord(node.passed) ? asArray(node.passed.nodes) : [];
  for (const passed of passedNodes) {
    if (!isRecord(passed)) {
      continue;
    }
    const checkName = asString(passed.name);
    if (checkName.startsWith(UNIT_TEST_JOB_PREFIX)) {
      passedUnitNames.push(checkName);
    }
  }

  return {
    suiteOrder,
    runId: failedUnit[0]?.runId ?? 0,
    runAttempt,
    failedUnit,
    passedUnitNames,
  };
}

function parseCommitObject(
  value: unknown,
  requestedSha: string,
): ShaCheckResult {
  if (!isRecord(value)) {
    return { headSha: requestedSha, suites: [], truncated: false };
  }
  const suiteNodes = isRecord(value.checkSuites)
    ? asArray(value.checkSuites.nodes)
    : [];
  const parsed = suiteNodes.map((node) => ({ node, suite: parseSuite(node) }));
  const suites = parsed
    .map(({ suite }) => suite)
    .filter((suite): suite is CiSuite => suite !== null)
    .sort((a, b) => a.suiteOrder - b.suiteOrder);

  // A hidden suite could be the ci one, so a truncated suite page is always a
  // gap. Truncated check-run pages only matter inside a ci suite — no other
  // workflow can hold a Unit tests job.
  const truncated =
    connectionTruncated(value.checkSuites) ||
    parsed.some(
      ({ node, suite }) =>
        suite !== null &&
        isRecord(node) &&
        (connectionTruncated(node.failed) || connectionTruncated(node.passed)),
    );

  return {
    headSha: asString(value.oid) || requestedSha,
    suites,
    truncated,
  };
}

export function parseShaBatchResponse(
  response: unknown,
  requestedShas: string[],
): ShaCheckResult[] {
  const repository = isRecord(response)
    ? isRecord(response.repository)
      ? response.repository
      : response
    : {};
  return requestedShas.map((sha, index) =>
    parseCommitObject(repository[`c${index}`], sha),
  );
}

export function confirmedFailThenPassJobs(
  sha: ShaCheckResult,
): ConfirmedFailThenPassJob[] {
  const confirmed: ConfirmedFailThenPassJob[] = [];
  const seenJobs = new Set<number>();

  for (const suite of sha.suites) {
    for (const failed of suite.failedUnit) {
      const laterPassInSameSuite = suite.passedUnitNames.includes(failed.name);
      const laterPassInLaterSuite = sha.suites.some(
        (other) =>
          other.suiteOrder > suite.suiteOrder &&
          other.passedUnitNames.includes(failed.name),
      );
      if (!laterPassInSameSuite && !laterPassInLaterSuite) {
        continue;
      }
      if (seenJobs.has(failed.jobId)) {
        continue;
      }
      seenJobs.add(failed.jobId);
      confirmed.push({
        name: failed.name,
        jobId: failed.jobId,
        runId: failed.runId,
      });
    }
  }
  return confirmed;
}

export type JobStep = {
  conclusion?: string | null;
  status?: string | null;
};

export type LoglessJobClassification = 'infrastructure' | 'missing_log';

/**
 * Tells a lost runner apart from a lost log for a job that failed with no
 * readable log.
 *
 * A runner that dies mid-step leaves the step `in_progress` forever and
 * uploads nothing: no test ever failed, so counting it as a fail-then-pass
 * invents a flake. A job whose steps all completed with a failure really did
 * fail — its log is simply gone, which is a hole in the history worth saying
 * out loud.
 */
export function classifyLoglessJob(job: {
  steps?: JobStep[] | null;
}): LoglessJobClassification {
  const steps = job.steps ?? [];
  if (steps.length === 0) {
    return 'infrastructure';
  }
  if (steps.some((step) => step.status !== 'completed')) {
    return 'infrastructure';
  }
  if (!steps.some((step) => step.conclusion === 'failure')) {
    return 'infrastructure';
  }
  return 'missing_log';
}

export function parseJestFailPaths(logText: string): string[] {
  const matches = logText.matchAll(
    /FAIL\s+(\S+\.(?:test|spec)\.(?:tsx|ts|js))(?=\s|$)/gm,
  );
  return [...matches].map((match) => match[1]);
}

export function intersectWithModifiedFiles(
  failPaths: string[],
  modifiedFiles: string[],
): string[] {
  const modified = new Set(modifiedFiles);
  return [...new Set(failPaths.filter((path) => modified.has(path)))];
}

export function hitsFromConfirmedLogs(
  jobs: ConfirmedFailThenPassJob[],
  failPathsByJobId: Map<number, string[]>,
  modifiedFiles: string[],
): SameShaLogHit[] {
  const hits: SameShaLogHit[] = [];
  for (const job of jobs) {
    const failPaths = failPathsByJobId.get(job.jobId) ?? [];
    for (const path of intersectWithModifiedFiles(failPaths, modifiedFiles)) {
      hits.push({ path, failRunId: job.runId, jobId: job.jobId });
    }
  }
  return hits;
}

export function unansweredModifiedFiles(
  modifiedFiles: string[],
  hits: { path: string }[],
): string[] {
  const answered = new Set(hits.map((hit) => hit.path));
  return modifiedFiles.filter((path) => !answered.has(path));
}

/**
 * `unreadFailedRuns` counts fail-then-pass logs a re-run could still read
 * (fetch budget cap, GitHub API error after retry). Two other gaps are
 * deliberately excluded because no re-run brings them back: logs GitHub
 * reports as missing, and jobs whose runner died before uploading anything.
 * Counting either would block all-clear on every PR until the run ages out of
 * the window; both are disclosed in the comment instead.
 */
export function historyCoverageComplete({
  everyFileHasHit,
  walkedAllCandidates,
  unreadFailedRuns,
}: {
  everyFileHasHit: boolean;
  walkedAllCandidates: boolean;
  unreadFailedRuns: number;
}): boolean {
  if (unreadFailedRuns > 0) {
    return false;
  }
  return everyFileHasHit || walkedAllCandidates;
}

export function shouldPostAllClear(
  hasFindings: boolean,
  historyComplete: boolean,
): boolean {
  return !hasFindings && historyComplete;
}

export function aggregateHitsByFile(
  hits: SameShaLogHit[],
  toJobLogUrl: (runId: number, jobId: number) => string,
): Map<string, SameShaFileHit> {
  const byFile = new Map<string, SameShaFileHit>();
  for (const hit of hits) {
    const existing = byFile.get(hit.path);
    if (!existing) {
      byFile.set(hit.path, {
        count: 1,
        exampleRunUrl: toJobLogUrl(hit.failRunId, hit.jobId),
      });
      continue;
    }
    existing.count += 1;
  }
  return byFile;
}

export function renderSameShaHistoryTable(
  files: {
    path: string;
    flaky: boolean;
    sameShaFailThenPass: number;
    exampleRunUrl: string;
  }[],
): string {
  if (files.length === 0) {
    return 'No same-SHA unit-test fail-then-pass found for the changed tests in the sampled window.';
  }

  const header = '| File | Same-SHA fail→pass (seen) | Example |';
  const divider = '|---|---|---|';
  const rows = files
    .map((file) => {
      const example =
        file.exampleRunUrl.length > 0 ? `[run](${file.exampleRunUrl})` : '—';
      return `| \`${file.path}\` | ${file.sameShaFailThenPass} | ${example} |`;
    })
    .join('\n');
  return `Same-SHA unit-test fail then pass (identical commit; Re-run jobs or a second ci.yml run):\n\n${header}\n${divider}\n${rows}\n`;
}

/**
 * States the range actually walked, so "nothing found" can be read against
 * the dates and commit count it is true of. The old wording quoted candidates
 * inspected out of candidates found, which read as full coverage even when a
 * one-query listing had already clipped the window to its newest days.
 */
export function renderCoverageWindowLine({
  window,
  candidatesInspected,
  candidateShaCount,
  unreadFailedRuns = 0,
  complete,
  hasFindings = true,
}: {
  window: CoverageWindow;
  candidatesInspected: number;
  candidateShaCount: number;
  unreadFailedRuns?: number;
  complete: boolean;
  hasFindings?: boolean;
}): string {
  const dates =
    window.oldestRunSampled && window.newestRunSampled
      ? `${window.oldestRunSampled} to ${window.newestRunSampled}`
      : `last ${window.lookbackDays} day(s)`;
  const commits = complete
    ? `${candidateShaCount} candidate commit(s)`
    : `${candidatesInspected} of ${candidateShaCount} candidate commit(s)`;
  const scope = `${dates}, ${window.runsListed} ci run(s), ${commits} inspected`;

  if (complete) {
    return `_History coverage: ${scope}._`;
  }

  const unread =
    unreadFailedRuns > 0
      ? ` ${unreadFailedRuns} confirmed fail-then-pass log(s) could not be read.`
      : '';
  // "Findings above" only makes sense when the table rendered rows.
  const verdict = hasFindings
    ? 'Findings above are a lower bound; this is not an all-clear.'
    : 'Nothing was found in the inspected range, but this is not an all-clear.';
  return `_History coverage incomplete: ${scope}.${unread} ${verdict}_`;
}

/**
 * Disclosed rather than blocking. A fail-then-pass we could not attribute to a
 * file is still the one lead the reader has — the shard name and job link say
 * where to look, and the AI patterns stay the other signal. Refusing all-clear
 * over it would make green unreachable on a repo that loses a runner most days.
 */
export function renderUnattributedRerunsLine(
  reruns: UnattributedRerun[],
  serverUrl: string,
  repo: string,
  totalCount = reruns.length,
): string {
  if (totalCount <= 0) {
    return '';
  }
  const shards = reruns
    .map((rerun) => {
      const url = jobLogUrl(serverUrl, repo, rerun.runId, rerun.jobId);
      const reason =
        rerun.reason === 'missing_log' ? 'log missing' : 'log unread';
      return `[${rerun.jobName}](${url}) (${reason})`;
    })
    .join(', ');
  const more =
    totalCount > reruns.length ? ` and ${totalCount - reruns.length} more` : '';
  const count = `${totalCount} unit-test re-run(s)`;
  return `_${count} in this window passed on retry but could not be attributed to a file: ${shards}${more}. Low signal — check the flaky patterns column._`;
}

/**
 * A runner that died before uploading anything never failed a test, so it is
 * reported as infrastructure rather than counted as history or as a gap.
 */
export function renderInfrastructureFailuresLine(count: number): string {
  if (count <= 0) {
    return '';
  }
  return `_${count} unit-test job(s) in this window ended without finishing their steps (lost runner); they carry no test signal._`;
}
