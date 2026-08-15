import { RuntimeNetworkEntry } from '../capture/hermes-collector';
import { ScenarioPreconditionState } from '../scenarios/types';
import { SwapsPerformanceArtifact } from './artifact';

const HIGH_VARIABILITY_RATIO = 0.2;
const SLOW_REQUEST_THRESHOLD_MS = 5_000;

export interface RangeStatistics {
  samples: number;
  min: number;
  median: number;
  max: number;
  range: number;
}

export interface NamedRange {
  name: string;
  statistics: RangeStatistics;
}

export interface RenderRange extends NamedRange {
  runsObserved: number;
}

export interface NetworkRequestRange {
  method: string;
  host: string;
  path: string;
  rpcMethod?: string;
  runsObserved: number;
  totalCalls: number;
  callsPerRun: RangeStatistics;
  durationMs: RangeStatistics | null;
}

export interface ComparisonFinding {
  severity: 'high' | 'medium' | 'info';
  message: string;
}

export interface SwapsPerformanceComparison {
  scenario: {
    id: string;
    name: string;
    slug: string;
    description: string;
  };
  commit: string;
  platform: 'ios-simulator';
  preconditions: ScenarioPreconditionState;
  runs: SwapsPerformanceArtifact[];
  successfulRuns: SwapsPerformanceArtifact[];
  failedRuns: SwapsPerformanceArtifact[];
  phaseDurations: NamedRange[];
  totalPhaseDuration: RangeStatistics;
  renders: RenderRange[];
  networkRequests: RangeStatistics;
  failedNetworkRequests: RangeStatistics;
  consoleErrors: RangeStatistics;
  networkRequestsByPhase: NamedRange[];
  requestGroups: NetworkRequestRange[];
  findings: ComparisonFinding[];
}

function canonicalizePreconditions(
  preconditions: ScenarioPreconditionState,
): string {
  return JSON.stringify(
    Object.entries(preconditions).sort(([first], [second]) =>
      first.localeCompare(second),
    ),
  );
}

function phaseNames(artifact: SwapsPerformanceArtifact): string[] {
  return artifact.phases.map((phase) => phase.name);
}

function requestKey(entry: RuntimeNetworkEntry): string {
  return JSON.stringify([
    entry.method,
    entry.host,
    entry.path,
    entry.rpcMethod ?? null,
  ]);
}

function requestLabel(entry: NetworkRequestRange): string {
  return `${entry.method} ${entry.host}${entry.path} ${entry.rpcMethod ?? ''}`;
}

function isHighVariability(statistics: RangeStatistics): boolean {
  if (statistics.median === 0) {
    return statistics.range > 0;
  }
  return statistics.range / statistics.median > HIGH_VARIABILITY_RATIO;
}

export function calculateRangeStatistics(values: number[]): RangeStatistics {
  if (values.length === 0) {
    throw new Error('Cannot calculate a range without samples');
  }

  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? (sorted[middle - 1] + sorted[middle]) / 2
      : sorted[middle];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];

  return {
    samples: sorted.length,
    min,
    median,
    max,
    range: max - min,
  };
}

function assertCompatibleIdentity(
  artifact: SwapsPerformanceArtifact,
  baseline: SwapsPerformanceArtifact,
): void {
  const checks: [string, string][] = [
    ['commit', artifact.run.commit],
    ['scenario ID', artifact.run.scenarioId],
    ['scenario slug', artifact.run.scenario],
    ['scenario name', artifact.run.scenarioName],
    ['scenario description', artifact.run.scenarioDescription],
    ['platform', artifact.run.platform],
  ];
  const expected = new Map<string, string>([
    ['commit', baseline.run.commit],
    ['scenario ID', baseline.run.scenarioId],
    ['scenario slug', baseline.run.scenario],
    ['scenario name', baseline.run.scenarioName],
    ['scenario description', baseline.run.scenarioDescription],
    ['platform', baseline.run.platform],
  ]);

  for (const [label, actual] of checks) {
    if (actual !== expected.get(label)) {
      throw new Error(
        `Run ${artifact.run.id} has a different ${label}: ${JSON.stringify(
          actual,
        )}`,
      );
    }
  }
}

function assertSuccessfulRunCompatibility(
  artifact: SwapsPerformanceArtifact,
  baseline: SwapsPerformanceArtifact,
): void {
  if (
    canonicalizePreconditions(artifact.preconditions) !==
    canonicalizePreconditions(baseline.preconditions)
  ) {
    throw new Error(
      `Run ${artifact.run.id} has different persisted preconditions`,
    );
  }

  if (
    JSON.stringify(phaseNames(artifact)) !==
    JSON.stringify(phaseNames(baseline))
  ) {
    throw new Error(`Run ${artifact.run.id} has different ordered phase names`);
  }

  if (!artifact.capture || !artifact.summary) {
    throw new Error(
      `Successful run ${artifact.run.id} is missing its runtime capture or summary`,
    );
  }

  for (const phase of artifact.phases) {
    if (artifact.summary.networkRequestsByPhase[phase.name] === undefined) {
      throw new Error(
        `Successful run ${artifact.run.id} is missing the ${phase.name} network request count`,
      );
    }
  }
}

function buildRequestGroups(
  successfulRuns: SwapsPerformanceArtifact[],
): NetworkRequestRange[] {
  const groups = new Map<
    string,
    {
      representative: RuntimeNetworkEntry;
      callsByRun: number[];
      durations: number[];
    }
  >();

  successfulRuns.forEach((artifact, runIndex) => {
    for (const entry of artifact.capture?.network ?? []) {
      const key = requestKey(entry);
      let group = groups.get(key);
      if (!group) {
        group = {
          representative: entry,
          callsByRun: Array.from({ length: successfulRuns.length }, () => 0),
          durations: [],
        };
        groups.set(key, group);
      }
      group.callsByRun[runIndex] += 1;
      if (entry.durationMs !== undefined) {
        group.durations.push(entry.durationMs);
      }
    }
  });

  return [...groups.values()]
    .map(({ representative, callsByRun, durations }) => ({
      method: representative.method,
      host: representative.host,
      path: representative.path,
      rpcMethod: representative.rpcMethod,
      runsObserved: callsByRun.filter((count) => count > 0).length,
      totalCalls: callsByRun.reduce((total, count) => total + count, 0),
      callsPerRun: calculateRangeStatistics(callsByRun),
      durationMs:
        durations.length > 0 ? calculateRangeStatistics(durations) : null,
    }))
    .sort(
      (first, second) =>
        second.totalCalls - first.totalCalls ||
        requestLabel(first).localeCompare(requestLabel(second)),
    );
}

function buildFindings(
  failedRuns: SwapsPerformanceArtifact[],
  successfulRuns: SwapsPerformanceArtifact[],
  phaseDurations: NamedRange[],
  renders: RenderRange[],
  failedNetworkRequests: RangeStatistics,
  consoleErrors: RangeStatistics,
  requestGroups: NetworkRequestRange[],
): ComparisonFinding[] {
  const findings: ComparisonFinding[] = [];

  for (const artifact of failedRuns) {
    findings.push({
      severity: 'high',
      message: `Run ${artifact.run.id} failed: ${
        artifact.failure ?? 'no failure message was recorded'
      }`,
    });
  }

  if (failedNetworkRequests.max > 0) {
    findings.push({
      severity: 'high',
      message: `Failed network requests ranged from ${failedNetworkRequests.min} to ${failedNetworkRequests.max} per successful run.`,
    });
  }
  if (consoleErrors.max > 0) {
    findings.push({
      severity: 'high',
      message: `Console errors ranged from ${consoleErrors.min} to ${consoleErrors.max} per successful run.`,
    });
  }

  for (const render of renders) {
    if (render.runsObserved < successfulRuns.length) {
      findings.push({
        severity: 'high',
        message: `${render.name} render data was captured in ${render.runsObserved} of ${successfulRuns.length} successful runs.`,
      });
    }
  }

  const intermittentRequests = requestGroups.filter(
    (request) => request.runsObserved < successfulRuns.length,
  );
  if (intermittentRequests.length > 0) {
    findings.push({
      severity: 'medium',
      message: `${intermittentRequests.length} network request group(s) appeared in only some successful runs.`,
    });
  }

  const slowRequestSamples = requestGroups.reduce(
    (count, request) =>
      count +
      (request.durationMs && request.durationMs.max > SLOW_REQUEST_THRESHOLD_MS
        ? 1
        : 0),
    0,
  );
  if (slowRequestSamples > 0) {
    findings.push({
      severity: 'medium',
      message: `${slowRequestSamples} network request group(s) had a duration sample over ${SLOW_REQUEST_THRESHOLD_MS} ms.`,
    });
  }

  for (const phase of phaseDurations) {
    if (isHighVariability(phase.statistics)) {
      findings.push({
        severity: 'medium',
        message: `${phase.name} phase duration has a range greater than 20% of its median.`,
      });
    }
  }
  for (const render of renders) {
    if (isHighVariability(render.statistics)) {
      findings.push({
        severity: 'medium',
        message: `${render.name} render count has a range greater than 20% of its median.`,
      });
    }
  }

  if (successfulRuns.length < 3) {
    findings.push({
      severity: 'info',
      message: `Only ${successfulRuns.length} successful runs were compared; collect at least three before drawing conclusions.`,
    });
  }
  findings.push({
    severity: 'info',
    message:
      'These ranges describe within-commit development-build variability, not a performance regression or improvement.',
  });

  return findings;
}

export function compareSwapsPerformanceArtifacts(
  artifacts: SwapsPerformanceArtifact[],
): SwapsPerformanceComparison {
  if (artifacts.length === 0) {
    throw new Error('No Swaps performance artifacts were provided');
  }

  for (const artifact of artifacts) {
    if (!Number.isFinite(Date.parse(artifact.run.createdAt))) {
      throw new Error(
        `Run ${artifact.run.id} has an invalid createdAt timestamp`,
      );
    }
  }

  const runs = [...artifacts].sort((first, second) => {
    const firstTimestamp = Date.parse(first.run.createdAt);
    const secondTimestamp = Date.parse(second.run.createdAt);
    return (
      firstTimestamp - secondTimestamp ||
      first.run.id.localeCompare(second.run.id)
    );
  });
  const baseline = runs[0];
  for (const artifact of runs.slice(1)) {
    assertCompatibleIdentity(artifact, baseline);
  }

  const successfulRuns = runs.filter(
    (artifact) => artifact.run.status === 'passed',
  );
  const failedRuns = runs.filter(
    (artifact) => artifact.run.status === 'failed',
  );
  if (successfulRuns.length < 2) {
    throw new Error(
      `At least two successful runs are required; found ${successfulRuns.length}`,
    );
  }

  const successfulBaseline = successfulRuns[0];
  for (const artifact of successfulRuns) {
    assertSuccessfulRunCompatibility(artifact, successfulBaseline);
  }

  const phaseDurations = successfulBaseline.phases.map((phase, phaseIndex) => ({
    name: phase.name,
    statistics: calculateRangeStatistics(
      successfulRuns.map((artifact) => artifact.phases[phaseIndex].durationMs),
    ),
  }));
  const totalPhaseDuration = calculateRangeStatistics(
    successfulRuns.map((artifact) =>
      artifact.phases.reduce((total, phase) => total + phase.durationMs, 0),
    ),
  );

  const renderNames = [
    ...new Set(
      successfulRuns.flatMap((artifact) =>
        Object.keys(artifact.summary?.renders ?? {}),
      ),
    ),
  ].sort();
  const renders = renderNames.map((name) => {
    const values = successfulRuns.flatMap((artifact) => {
      const value = artifact.summary?.renders[name];
      return value === undefined ? [] : [value];
    });
    return {
      name,
      runsObserved: values.length,
      statistics: calculateRangeStatistics(values),
    };
  });

  const networkRequests = calculateRangeStatistics(
    successfulRuns.map((artifact) => artifact.summary?.networkRequests ?? 0),
  );
  const failedNetworkRequests = calculateRangeStatistics(
    successfulRuns.map(
      (artifact) => artifact.summary?.failedNetworkRequests ?? 0,
    ),
  );
  const consoleErrors = calculateRangeStatistics(
    successfulRuns.map((artifact) => artifact.summary?.consoleErrors ?? 0),
  );
  const networkRequestsByPhase = successfulBaseline.phases.map((phase) => ({
    name: phase.name,
    statistics: calculateRangeStatistics(
      successfulRuns.map(
        (artifact) => artifact.summary?.networkRequestsByPhase[phase.name] ?? 0,
      ),
    ),
  }));
  const requestGroups = buildRequestGroups(successfulRuns);
  const findings = buildFindings(
    failedRuns,
    successfulRuns,
    phaseDurations,
    renders,
    failedNetworkRequests,
    consoleErrors,
    requestGroups,
  );

  return {
    scenario: {
      id: baseline.run.scenarioId,
      name: baseline.run.scenarioName,
      slug: baseline.run.scenario,
      description: baseline.run.scenarioDescription,
    },
    commit: baseline.run.commit,
    platform: baseline.run.platform,
    preconditions: successfulBaseline.preconditions,
    runs,
    successfulRuns,
    failedRuns,
    phaseDurations,
    totalPhaseDuration,
    renders,
    networkRequests,
    failedNetworkRequests,
    consoleErrors,
    networkRequestsByPhase,
    requestGroups,
    findings,
  };
}
