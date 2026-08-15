import {
  isRuntimeNetworkEntry,
  RuntimeCapture,
  RuntimeNetworkEntry,
} from '../capture/hermes-collector';
import { ScenarioPhase } from '../scenarios/types';
import type { SwapsPerformanceArtifact } from './artifact';

export interface ScenarioSummary {
  networkRequests: number;
  failedNetworkRequests: number;
  consoleErrors: number;
  renders: Record<string, number>;
  networkRequestsByPhase: Record<string, number>;
  slowestNetworkRequests: RuntimeNetworkEntry[];
}

export interface ScenarioFinding {
  severity: 'high' | 'medium' | 'info';
  message: string;
}

export interface NetworkRequestCount {
  method: string;
  host: string;
  path: string;
  rpcMethod?: string;
  count: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseNumberRecord(value: unknown): Record<string, number> | null {
  if (!isRecord(value)) {
    return null;
  }

  const numbers: Record<string, number> = {};
  for (const [name, entry] of Object.entries(value)) {
    if (typeof entry !== 'number') {
      return null;
    }
    numbers[name] = entry;
  }
  return numbers;
}

export function parseScenarioSummary(value: unknown): ScenarioSummary | null {
  if (
    !isRecord(value) ||
    typeof value.networkRequests !== 'number' ||
    typeof value.failedNetworkRequests !== 'number' ||
    typeof value.consoleErrors !== 'number' ||
    !Array.isArray(value.slowestNetworkRequests) ||
    !value.slowestNetworkRequests.every(isRuntimeNetworkEntry)
  ) {
    return null;
  }

  const renders = parseNumberRecord(value.renders);
  const networkRequestsByPhase = parseNumberRecord(
    value.networkRequestsByPhase,
  );
  if (!renders || !networkRequestsByPhase) {
    return null;
  }

  return {
    networkRequests: value.networkRequests,
    failedNetworkRequests: value.failedNetworkRequests,
    consoleErrors: value.consoleErrors,
    renders,
    networkRequestsByPhase,
    slowestNetworkRequests: value.slowestNetworkRequests,
  };
}

export function summarizeCapture(
  capture: RuntimeCapture,
  phases: ScenarioPhase[],
): ScenarioSummary {
  const renders = Object.fromEntries(
    Object.entries(capture.renders).map(([name, entry]) => [name, entry.count]),
  );
  const networkRequestsByPhase = Object.fromEntries(
    phases.map((phase) => [
      phase.name,
      capture.network.filter(
        (entry) =>
          entry.timestamp >= phase.startedAt &&
          entry.timestamp <= phase.endedAt,
      ).length,
    ]),
  );
  const slowestNetworkRequests = [...capture.network]
    .filter((entry) => entry.durationMs !== undefined)
    .sort((first, second) => (second.durationMs ?? 0) - (first.durationMs ?? 0))
    .slice(0, 5);

  return {
    networkRequests: capture.network.length,
    failedNetworkRequests: capture.network.filter(
      (entry) =>
        entry.error !== undefined ||
        (entry.status !== undefined && entry.status >= 400),
    ).length,
    consoleErrors: capture.console.filter((entry) => entry.level === 'error')
      .length,
    renders,
    networkRequestsByPhase,
    slowestNetworkRequests,
  };
}

export function findScenarioFindings(
  artifact: SwapsPerformanceArtifact,
): ScenarioFinding[] {
  const findings: ScenarioFinding[] = [];

  if (artifact.failure) {
    findings.push({
      severity: 'high',
      message: `Scenario failed: ${artifact.failure}`,
    });
  }
  if (!artifact.capture || !artifact.summary) {
    findings.push({
      severity: 'high',
      message: 'Runtime capture or summary is missing.',
    });
  } else {
    if (Object.keys(artifact.summary.renders).length === 0) {
      findings.push({
        severity: 'high',
        message:
          'No render probes were captured; run the prepare step before Metro bundles the scenario.',
      });
    }
    if (artifact.summary.failedNetworkRequests > 0) {
      findings.push({
        severity: 'high',
        message: `${artifact.summary.failedNetworkRequests} network request(s) failed.`,
      });
    }
    if (artifact.summary.consoleErrors > 0) {
      findings.push({
        severity: 'high',
        message: `${artifact.summary.consoleErrors} console error(s) were captured.`,
      });
    }

    const slowRequests = artifact.summary.slowestNetworkRequests.filter(
      (entry) => (entry.durationMs ?? 0) > 5_000,
    );
    if (slowRequests.length > 0) {
      findings.push({
        severity: 'medium',
        message: `${slowRequests.length} network request(s) took longer than 5000 ms.`,
      });
    }
  }

  findings.push({
    severity: 'info',
    message:
      'This is one development-build run. Compare repeated runs on the same simulator before attributing a regression.',
  });

  return findings;
}

export function summarizeNetworkRequestCounts(
  entries: RuntimeNetworkEntry[],
): NetworkRequestCount[] {
  const counts = new Map<string, NetworkRequestCount>();

  for (const entry of entries) {
    const key = JSON.stringify([
      entry.method,
      entry.host,
      entry.path,
      entry.rpcMethod ?? null,
    ]);
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, {
        method: entry.method,
        host: entry.host,
        path: entry.path,
        rpcMethod: entry.rpcMethod,
        count: 1,
      });
    }
  }

  return [...counts.values()].sort(
    (first, second) =>
      second.count - first.count ||
      `${first.method} ${first.host}${first.path} ${first.rpcMethod ?? ''}`.localeCompare(
        `${second.method} ${second.host}${second.path} ${
          second.rpcMethod ?? ''
        }`,
      ),
  );
}
