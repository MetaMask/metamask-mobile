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

/**
 * Stage 2 `--changed-files` must include historically flaky paths even when
 * their bytes have not changed since `analyzedSha`. Otherwise skip-if-unchanged
 * starves pattern analysis and Stage 3 reports history_unreviewed.
 */
export function filesToAnalyzeWithHistoryHits(
  needsAnalysis: string[],
  historyFiles: { path: string; flaky: boolean }[],
): string[] {
  const seen = new Set(needsAnalysis);
  const extra = historyFiles
    .filter((file) => file.flaky && !seen.has(file.path))
    .map((file) => file.path);
  return [...needsAnalysis, ...extra];
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

export function isCandidateShaGroup(runsForSha: ListedWorkflowRun[]): boolean {
  if (runsForSha.some((run) => run.runAttempt > 1)) {
    return true;
  }
  const uniqueRunIds = new Set(runsForSha.map((run) => run.id));
  if (uniqueRunIds.size < 2) {
    return false;
  }
  const conclusions = new Set(runsForSha.map((run) => run.conclusion));
  return conclusions.has('failure') && conclusions.has('success');
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

const COMMIT_FIELDS = `{
  oid
  checkSuites(first: 40) {
    nodes {
      workflowRun {
        databaseId
        runAttempt
        workflow { name }
      }
      failed: checkRuns(first: 20, filterBy: { checkType: ALL, conclusions: [FAILURE] }) {
        nodes { name detailsUrl }
      }
      passed: checkRuns(first: 50, filterBy: { checkType: LATEST, conclusions: [SUCCESS] }) {
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
    return { headSha: requestedSha, suites: [] };
  }
  const checkSuites = isRecord(value.checkSuites)
    ? asArray(value.checkSuites.nodes)
    : [];
  const suites = checkSuites
    .map(parseSuite)
    .filter((suite): suite is CiSuite => suite !== null)
    .sort((a, b) => a.suiteOrder - b.suiteOrder);
  return {
    headSha: asString(value.oid) || requestedSha,
    suites,
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

export function historyCoverageComplete({
  everyFileHasHit,
  walkedAllCandidates,
}: {
  everyFileHasHit: boolean;
  walkedAllCandidates: boolean;
}): boolean {
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

export function renderIncompleteCoverageLine({
  candidatesInspected,
  candidateShaCount,
}: {
  candidatesInspected: number;
  candidateShaCount: number;
}): string {
  return `_History coverage incomplete: inspected ${candidatesInspected} of ${candidateShaCount} candidate SHA(s). Findings above are a lower bound; this is not an all-clear._`;
}
