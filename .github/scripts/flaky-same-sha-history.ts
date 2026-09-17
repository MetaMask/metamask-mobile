/**
 * Same-SHA unit-test fail-then-pass detection.
 *
 * A later commit can change production code or Jest setup and make a test
 * pass, so only an identical head SHA is a "no fix landed" signal. GitHub
 * Re-run jobs (attempt 1 → 2 on one run id) and a second ci.yml run on that
 * commit are both valid; fail on SHA A then pass on SHA B is not.
 */

export const UNIT_TEST_JOB_PREFIX = 'Unit tests';

export type ListedWorkflowRun = {
  id: number;
  conclusion: string | null;
  createdAt: string;
  headSha: string;
  runAttempt: number;
};

export type WorkflowJob = {
  id: number;
  name: string;
  conclusion: string | null;
};

export type RunAttemptSnapshot = {
  runId: number;
  attempt: number;
  createdAt: string;
};

export type InspectedSnapshot = RunAttemptSnapshot & {
  unitFailPaths: string[];
  unitAllPassed: boolean;
};

export type SameShaFileHit = {
  count: number;
  exampleRunUrl: string;
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
  return uniqueRunIds.size >= 2;
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

export function snapshotsToInspect(
  runsForSha: ListedWorkflowRun[],
): RunAttemptSnapshot[] {
  const byKey = new Map<string, RunAttemptSnapshot>();
  for (const run of runsForSha) {
    const latestKey = `${run.id}:${run.runAttempt}`;
    byKey.set(latestKey, {
      runId: run.id,
      attempt: run.runAttempt,
      createdAt: run.createdAt,
    });
    if (run.runAttempt > 1) {
      const firstKey = `${run.id}:1`;
      if (!byKey.has(firstKey)) {
        byKey.set(firstKey, {
          runId: run.id,
          attempt: 1,
          createdAt: run.createdAt,
        });
      }
    }
  }
  return [...byKey.values()];
}

export function snapshotInspectOrder(
  snapshots: RunAttemptSnapshot[],
  runsForSha: ListedWorkflowRun[],
): RunAttemptSnapshot[] {
  const conclusionByRunId = new Map(
    runsForSha.map((run) => [run.id, run.conclusion]),
  );
  const rank = (snapshot: RunAttemptSnapshot): number => {
    if (snapshot.attempt === 1) {
      const listed = runsForSha.find((run) => run.id === snapshot.runId);
      if (listed && listed.runAttempt > 1) {
        return 0;
      }
    }
    if (conclusionByRunId.get(snapshot.runId) === 'failure') {
      return 1;
    }
    return 2;
  };

  return [...snapshots].sort((a, b) => {
    const rankDiff = rank(a) - rank(b);
    if (rankDiff !== 0) {
      return rankDiff;
    }
    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });
}

export function isLaterSnapshot(
  later: RunAttemptSnapshot,
  earlier: RunAttemptSnapshot,
): boolean {
  if (later.runId === earlier.runId) {
    return later.attempt > earlier.attempt;
  }
  return Date.parse(later.createdAt) > Date.parse(earlier.createdAt);
}

export function failedUnitTestJobs(jobs: WorkflowJob[]): WorkflowJob[] {
  return jobs.filter(
    (job) =>
      job.conclusion === 'failure' && job.name.startsWith(UNIT_TEST_JOB_PREFIX),
  );
}

export function allUnitTestJobsSucceeded(jobs: WorkflowJob[]): boolean {
  const unitJobs = jobs.filter((job) =>
    job.name.startsWith(UNIT_TEST_JOB_PREFIX),
  );
  return (
    unitJobs.length > 0 && unitJobs.every((job) => job.conclusion === 'success')
  );
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

export function collectSameShaHitsForGroup(
  snapshots: InspectedSnapshot[],
  modifiedFiles: string[],
): { path: string; failRunId: number }[] {
  const failSides = snapshots.filter(
    (snapshot) => snapshot.unitFailPaths.length > 0,
  );
  const passSides = snapshots.filter((snapshot) => snapshot.unitAllPassed);

  const hits: { path: string; failRunId: number }[] = [];
  for (const fail of failSides) {
    const hasLaterPass = passSides.some((pass) => isLaterSnapshot(pass, fail));
    if (!hasLaterPass) {
      continue;
    }
    for (const path of intersectWithModifiedFiles(
      fail.unitFailPaths,
      modifiedFiles,
    )) {
      hits.push({ path, failRunId: fail.runId });
    }
  }
  return hits;
}

export function aggregateHitsByFile(
  hits: { path: string; failRunId: number }[],
  runUrl: (runId: number) => string,
): Map<string, SameShaFileHit> {
  const byFile = new Map<string, SameShaFileHit>();
  for (const hit of hits) {
    const existing = byFile.get(hit.path);
    if (!existing) {
      byFile.set(hit.path, {
        count: 1,
        exampleRunUrl: runUrl(hit.failRunId),
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

  const header = '| File | Same-SHA fail→pass | Example |';
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
