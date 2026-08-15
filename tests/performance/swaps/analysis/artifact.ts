import {
  parseRuntimeCapture,
  RuntimeCapture,
} from '../capture/hermes-collector';
import { resolveScenarioBySlug } from '../scenarios/registry';
import {
  ScenarioMetadata,
  ScenarioPhase,
  ScenarioPreconditionState,
  ScenarioPreconditionValue,
} from '../scenarios/types';
import { parseScenarioSummary, ScenarioSummary } from './summarize';

export interface SwapsPerformanceArtifact {
  schemaVersion: 1;
  run: {
    id: string;
    scenario: string;
    scenarioId: string;
    scenarioName: string;
    scenarioDescription: string;
    createdAt: string;
    commit: string;
    platform: 'ios-simulator';
    metroPort: number;
    status: 'passed' | 'failed';
  };
  preconditions: ScenarioPreconditionState;
  phases: ScenarioPhase[];
  capture: RuntimeCapture | null;
  summary: ScenarioSummary | null;
  failure: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isScenarioPhase(value: unknown): value is ScenarioPhase {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    typeof value.startedAt === 'number' &&
    typeof value.endedAt === 'number' &&
    typeof value.durationMs === 'number'
  );
}

function isPreconditionValue(
  value: unknown,
): value is ScenarioPreconditionValue {
  return (
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'number' ||
    typeof value === 'string'
  );
}

function parsePreconditions(value: unknown): ScenarioPreconditionState | null {
  if (!isRecord(value)) {
    return null;
  }

  const preconditions: ScenarioPreconditionState = {};
  for (const [name, entry] of Object.entries(value)) {
    if (!isPreconditionValue(entry)) {
      return null;
    }
    preconditions[name] = entry;
  }
  return preconditions;
}

function resolveArtifactMetadata(slug: string): ScenarioMetadata | null {
  try {
    return resolveScenarioBySlug(slug).metadata;
  } catch {
    return null;
  }
}

export function parseSwapsPerformanceArtifact(
  value: unknown,
): SwapsPerformanceArtifact | null {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    !isRecord(value.run) ||
    typeof value.run.id !== 'string' ||
    typeof value.run.scenario !== 'string' ||
    typeof value.run.createdAt !== 'string' ||
    typeof value.run.commit !== 'string' ||
    value.run.platform !== 'ios-simulator' ||
    typeof value.run.metroPort !== 'number' ||
    (value.run.status !== 'passed' && value.run.status !== 'failed') ||
    !Array.isArray(value.phases) ||
    !value.phases.every(isScenarioPhase) ||
    (value.failure !== null && typeof value.failure !== 'string')
  ) {
    return null;
  }

  const metadata = resolveArtifactMetadata(value.run.scenario);
  if (
    !metadata ||
    value.run.scenarioId !== metadata.id ||
    value.run.scenarioName !== metadata.name ||
    value.run.scenarioDescription !== metadata.description
  ) {
    return null;
  }

  const preconditions = parsePreconditions(value.preconditions);
  const capture =
    value.capture === null ? null : parseRuntimeCapture(value.capture);
  const summary =
    value.summary === null ? null : parseScenarioSummary(value.summary);
  if (
    !preconditions ||
    (value.capture !== null && capture === null) ||
    (value.summary !== null && summary === null)
  ) {
    return null;
  }

  return {
    schemaVersion: 1,
    run: {
      id: value.run.id,
      scenario: metadata.slug,
      scenarioId: metadata.id,
      scenarioName: metadata.name,
      scenarioDescription: metadata.description,
      createdAt: value.run.createdAt,
      commit: value.run.commit,
      platform: metadata.platform,
      metroPort: value.run.metroPort,
      status: value.run.status,
    },
    preconditions,
    phases: value.phases,
    capture,
    summary,
    failure: value.failure,
  };
}
