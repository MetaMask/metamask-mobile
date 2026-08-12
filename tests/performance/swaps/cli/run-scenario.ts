/* eslint-disable import-x/no-nodejs-modules */
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SwapsPerformanceArtifact } from '../analysis/artifact';
import { formatArtifactMarkdown } from '../analysis/markdown-report';
import { summarizeCapture } from '../analysis/summarize';
import {
  buildDrainDiagnosticsExpression,
  buildInstallDiagnosticsExpression,
  buildMarkerExpression,
  extractCdpEvaluationValue,
  parseRuntimeCapture,
  RuntimeCapture,
} from '../capture/hermes-collector';
import { getInstrumentationStatus } from '../capture/source-instrumentation';
import { resolveScenario } from '../scenarios/registry';
import {
  ScenarioContext,
  ScenarioPhase,
  ScenarioPreconditionState,
} from '../scenarios/types';
import { resolveArtifactOutputPaths } from './artifact-paths';
import {
  buildMmSessionProbeArgs,
  extractInteractionText,
  formatMmSessionSetupCommand,
  parseMetroPort,
} from './runner-support';

const LOG_PREFIX = '[SWAPS_PERF_ANALYSIS]';
const COMMAND_TIMEOUT_MS = 60_000;
// Maximum timeout accepted by the mm CLI.
const MM_COMMAND_TIMEOUT_MS = 30_000;
const OUTPUT_DIRECTORY = resolve(
  process.cwd(),
  'test-reports/swaps-performance',
);

interface CommandResult {
  ok: boolean;
  stdout: string;
  stderr: string;
}

function log(message: string): void {
  process.stdout.write(`${LOG_PREFIX} ${message}\n`);
}

function sanitizeFailure(message: string): string {
  return message
    .replace(/https?:\/\/\S+/gu, '[url]')
    .replace(/0x[0-9a-f]{16,}/giu, '[hex]')
    .slice(0, 500);
}

function runYarn(args: string[], allowFailure = false): CommandResult {
  const result = spawnSync('yarn', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: COMMAND_TIMEOUT_MS,
  });
  const stdout = result.stdout.trim();
  const stderr = result.stderr.trim();
  const ok = result.status === 0 && result.error === undefined;

  if (!ok && !allowFailure) {
    const detail = stderr || result.error?.message || 'command failed';
    throw new Error(`yarn ${args[0]} failed: ${sanitizeFailure(detail)}`);
  }

  return { ok, stdout, stderr };
}

function parseCommandOutput(output: string): unknown {
  if (!output) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(output);
    return parsed;
  } catch {
    return output;
  }
}

function runMm(args: string[], allowFailure = false): unknown {
  const result = runYarn(['mm', ...args], allowFailure);
  return result.ok ? parseCommandOutput(result.stdout) : null;
}

function evaluateRuntime(expression: string): unknown {
  const output = runMm([
    'cdp',
    'Runtime.evaluate',
    JSON.stringify({ expression, returnByValue: true }),
    '--timeout',
    String(MM_COMMAND_TIMEOUT_MS),
  ]);
  return extractCdpEvaluationValue(output);
}

function markRuntime(name: string): void {
  evaluateRuntime(buildMarkerExpression(name));
}

function readRuntimeCapture(): RuntimeCapture | null {
  const serialized = evaluateRuntime(buildDrainDiagnosticsExpression());
  if (typeof serialized !== 'string') {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(serialized);
    return parseRuntimeCapture(parsed);
  } catch {
    return null;
  }
}

function getCommit(): string {
  const result = spawnSync('git', ['rev-parse', '--short', 'HEAD'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  return result.status === 0 ? result.stdout.trim() : 'unknown';
}

function writeArtifact(artifact: SwapsPerformanceArtifact): {
  jsonPath: string;
  markdownPath: string;
} {
  const { directory, jsonPath, markdownPath } = resolveArtifactOutputPaths(
    OUTPUT_DIRECTORY,
    artifact.run.createdAt,
    artifact.run.commit,
    artifact.run.scenario,
    artifact.run.id,
  );
  mkdirSync(directory, { recursive: true });
  writeFileSync(jsonPath, `${JSON.stringify(artifact, null, 2)}\n`);
  writeFileSync(markdownPath, formatArtifactMarkdown(artifact));
  return { jsonPath, markdownPath };
}

function createScenarioContext(): ScenarioContext {
  return {
    log,
    clickTestId: (testId) => {
      runMm(['click', '--testid', testId, '--timeout', '10000']);
    },
    waitForTestId: (testId, timeoutMs) => {
      runMm(['wait-for', '--testid', testId, '--timeout', String(timeoutMs)]);
    },
    getVisibleText: (testId, allowFailure = false) => {
      const output = runMm(
        ['get-text', '--testid', testId, '--timeout', '5000'],
        allowFailure,
      );
      return extractInteractionText(output, testId);
    },
    getExactScreenText: (testId) =>
      extractInteractionText(runMm(['describe-screen']), testId),
    delay: (durationMs) =>
      new Promise((resolveDelay) => {
        setTimeout(resolveDelay, durationMs);
      }),
    now: Date.now,
    measurePhase: async (name, action): Promise<ScenarioPhase> => {
      markRuntime(`${name}:start`);
      const startedAt = Date.now();
      await action();
      const endedAt = Date.now();
      markRuntime(`${name}:end`);
      return { name, startedAt, endedAt, durationMs: endedAt - startedAt };
    },
  };
}

export async function runSwapsPerformanceScenario(
  scenarioReference: string,
  scenarioArgs: string[],
): Promise<void> {
  const scenario = resolveScenario(scenarioReference);
  const metroPort = parseMetroPort(scenarioArgs);
  const createdAt = new Date();
  const commit = getCommit();
  const runId = `${scenario.metadata.id.toLowerCase()}-${
    scenario.metadata.slug
  }-${createdAt.toISOString().replace(/[:.]/gu, '-')}`;
  let phases: ScenarioPhase[] = [];
  let preconditions: ScenarioPreconditionState = { walletUnlocked: false };
  let capture: RuntimeCapture | null = null;
  let failure: string | null = null;
  let diagnosticsInstalled = false;
  let sessionAvailable = false;

  log(`starting ${runId}`);
  log(`using Metro port ${metroPort}`);

  try {
    const instrumentationStatus = getInstrumentationStatus(process.cwd());
    if (instrumentationStatus !== 'prepared') {
      throw new Error(
        `Swaps performance instrumentation is not prepared (status: ${instrumentationStatus}); run yarn performance:swaps prepare before Metro starts`,
      );
    }

    log('checking iOS simulator prerequisites');
    runYarn(['mm:doctor']);

    log('verifying the pre-established mm and Hermes session');
    const sessionProbe = runYarn(['mm', ...buildMmSessionProbeArgs()], true);
    if (!sessionProbe.ok) {
      throw new Error(
        `No active mm session is available. First run ${formatMmSessionSetupCommand(
          metroPort,
        )}, then unlock MetaMask and leave it on Wallet before rerunning ${scenario.metadata.id}.`,
      );
    }
    sessionAvailable = true;
    log(
      'reusing the active mm session without launching or refreshing the app',
    );

    runMm([
      'wait-for',
      '--testid',
      scenario.startingTestId,
      '--timeout',
      '10000',
    ]);
    preconditions = { walletUnlocked: true };

    const installResult = evaluateRuntime(buildInstallDiagnosticsExpression());
    if (typeof installResult !== 'string') {
      throw new Error('Hermes diagnostics collector did not initialize');
    }
    diagnosticsInstalled = true;

    const result = await scenario.run(createScenarioContext());
    phases = result.phases;
    preconditions = result.preconditions;

    markRuntime('scenario:complete');
    await new Promise((resolveDelay) => {
      setTimeout(resolveDelay, 500);
    });
    runMm(['describe-screen']);
    runMm(['screenshot', '--name', `${runId}-quote`]);
    log('quote became visible');
  } catch (error) {
    failure = sanitizeFailure(
      error instanceof Error ? error.message : String(error),
    );
    log(`scenario failed: ${failure}`);
    if (sessionAvailable) {
      runMm(['screenshot', '--name', `${runId}-failure`], true);
    }
  } finally {
    if (diagnosticsInstalled) {
      capture = readRuntimeCapture();
    }

    if (!failure && (!capture || Object.keys(capture.renders).length === 0)) {
      failure =
        'No render probes were captured. Run yarn performance:swaps prepare before starting the scenario.';
    }

    const artifact: SwapsPerformanceArtifact = {
      schemaVersion: 1,
      run: {
        id: runId,
        scenario: scenario.metadata.slug,
        scenarioId: scenario.metadata.id,
        scenarioName: scenario.metadata.name,
        scenarioDescription: scenario.metadata.description,
        createdAt: createdAt.toISOString(),
        commit,
        platform: scenario.metadata.platform,
        metroPort,
        status: failure ? 'failed' : 'passed',
      },
      preconditions,
      phases,
      capture,
      summary: capture ? summarizeCapture(capture, phases) : null,
      failure,
    };
    const paths = writeArtifact(artifact);

    log(`JSON artifact: ${paths.jsonPath}`);
    log(`Markdown report: ${paths.markdownPath}`);
    if (sessionAvailable) {
      runMm(['cleanup'], true);
    }
  }

  if (failure) {
    throw new Error(failure);
  }
}
