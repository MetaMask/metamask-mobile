/* eslint-disable import-x/no-nodejs-modules */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  buildDrainDiagnosticsExpression,
  buildInstallDiagnosticsExpression,
  buildMarkerExpression,
  extractCdpEvaluationValue,
  extractInteractionText,
  formatArtifactMarkdown,
  hasPositiveNumericValue,
  parseRuntimeCapture,
  RuntimeCapture,
  ScenarioPhase,
  summarizeCapture,
  SwapsPerformanceArtifact,
} from './diagnostics';

const LOG_PREFIX = '[SWAPS_PERF_ANALYSIS]';
const DEFAULT_METRO_PORT = 8081;
const QUOTE_TIMEOUT_MS = 30_000;
const QUOTE_POLL_INTERVAL_MS = 350;
const COMMAND_TIMEOUT_MS = 60_000;
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
  if (!result.ok) {
    return null;
  }
  return parseCommandOutput(result.stdout);
}

function evaluateRuntime(expression: string): unknown {
  const output = runMm([
    'cdp',
    'Runtime.evaluate',
    JSON.stringify({ expression, returnByValue: true }),
    '--timeout',
    '35000',
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

function getVisibleText(testId: string, allowFailure = false): string | null {
  const output = runMm(
    ['get-text', '--testid', testId, '--timeout', '5000'],
    allowFailure,
  );
  return extractInteractionText(output);
}

function waitForTestId(testId: string, timeoutMs: number): void {
  runMm(['wait-for', '--testid', testId, '--timeout', String(timeoutMs)]);
}

function clickTestId(testId: string): void {
  runMm(['click', '--testid', testId, '--timeout', '10000']);
}

function typeTestId(testId: string, text: string): void {
  runMm(['type', '--testid', testId, text, '--timeout', '10000']);
}

function delay(durationMs: number): Promise<void> {
  return new Promise((resolveDelay) => {
    setTimeout(resolveDelay, durationMs);
  });
}

async function waitForPositiveQuote(): Promise<string> {
  const deadline = Date.now() + QUOTE_TIMEOUT_MS;
  let lastText: string | null = null;

  while (Date.now() < deadline) {
    lastText = getVisibleText('dest-token-area-input', true);
    if (hasPositiveNumericValue(lastText)) {
      return lastText ?? '';
    }
    await delay(QUOTE_POLL_INTERVAL_MS);
  }

  throw new Error(
    `First quote did not become visible within ${QUOTE_TIMEOUT_MS}ms; last destination text was ${JSON.stringify(
      lastText,
    )}`,
  );
}

async function measurePhase(
  name: ScenarioPhase['name'],
  action: () => Promise<void> | void,
): Promise<ScenarioPhase> {
  markRuntime(`${name}:start`);
  const startedAt = Date.now();
  await action();
  const endedAt = Date.now();
  markRuntime(`${name}:end`);

  return {
    name,
    startedAt,
    endedAt,
    durationMs: endedAt - startedAt,
  };
}

function getCommit(): string {
  const result = spawnSync('git', ['rev-parse', '--short', 'HEAD'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  return result.status === 0 ? result.stdout.trim() : 'unknown';
}

function parseMetroPort(argv: string[]): number {
  const flagIndex = argv.indexOf('--metro-port');
  if (flagIndex === -1) {
    return DEFAULT_METRO_PORT;
  }

  const value = Number(argv[flagIndex + 1]);
  if (!Number.isInteger(value) || value <= 0 || value > 65_535) {
    throw new Error('--metro-port must be an integer between 1 and 65535');
  }
  return value;
}

function writeArtifact(artifact: SwapsPerformanceArtifact): {
  jsonPath: string;
  markdownPath: string;
} {
  mkdirSync(OUTPUT_DIRECTORY, { recursive: true });
  const jsonPath = resolve(OUTPUT_DIRECTORY, `${artifact.run.id}.json`);
  const markdownPath = resolve(OUTPUT_DIRECTORY, `${artifact.run.id}.md`);
  writeFileSync(jsonPath, `${JSON.stringify(artifact, null, 2)}\n`);
  writeFileSync(markdownPath, formatArtifactMarkdown(artifact));
  return { jsonPath, markdownPath };
}

async function runScenario(): Promise<void> {
  const metroPort = parseMetroPort(process.argv.slice(2));
  const createdAt = new Date();
  const runId = `open-swaps-fetch-one-eth-quote-${createdAt
    .toISOString()
    .replace(/[:.]/gu, '-')}`;
  const phases: ScenarioPhase[] = [];
  let capture: RuntimeCapture | null = null;
  let sourceTokenText: string | null = null;
  let walletUnlocked = false;
  let failure: string | null = null;
  let diagnosticsInstalled = false;

  log(`starting ${runId}`);
  log(`using Metro port ${metroPort}`);

  try {
    log('checking iOS simulator prerequisites');
    runYarn(['mm:doctor']);

    log('launching the installed app with Hermes attached');
    runMm(['launch', '--force', '--metro-port', String(metroPort)]);

    waitForTestId('wallet-swap-button', 10_000);
    walletUnlocked = true;

    const installResult = evaluateRuntime(buildInstallDiagnosticsExpression());
    if (typeof installResult !== 'string') {
      throw new Error('Hermes diagnostics collector did not initialize');
    }
    diagnosticsInstalled = true;

    log('opening Swaps');
    phases.push(
      await measurePhase('open-swaps', () => {
        clickTestId('wallet-swap-button');
        waitForTestId('source-token-area-input', 15_000);
      }),
    );

    sourceTokenText = getVisibleText('source-token-area');
    if (!sourceTokenText?.toUpperCase().includes('ETH')) {
      throw new Error(
        'Expected ETH as the source token. Switch the Wallet to Ethereum and retry.',
      );
    }

    log('selecting Ethereum USDC as the destination');
    phases.push(
      await measurePhase('select-destination', () => {
        clickTestId('dest-token-area');
        waitForTestId('bridge-token-search-input', 10_000);
        typeTestId('bridge-token-search-input', 'USDC');
        waitForTestId('asset-0x1-USDC', 20_000);
        clickTestId('asset-0x1-USDC');
        waitForTestId('dest-token-area-input', 10_000);
      }),
    );

    log('entering 1 ETH and waiting for the first quote');
    phases.push(
      await measurePhase('fetch-first-quote', async () => {
        clickTestId('source-token-area-input');
        waitForTestId('keypad-delete-button', 10_000);
        clickTestId('keypad-delete-button');
        clickTestId('keypad-key-1');
        await waitForPositiveQuote();
      }),
    );

    markRuntime('scenario:complete');
    await delay(500);
    runMm(['describe-screen']);
    runMm(['screenshot', '--name', `${runId}-quote`]);
    log('quote became visible');
  } catch (error) {
    failure = sanitizeFailure(
      error instanceof Error ? error.message : String(error),
    );
    log(`scenario failed: ${failure}`);
    runMm(['screenshot', '--name', `${runId}-failure`], true);
  } finally {
    if (diagnosticsInstalled) {
      capture = readRuntimeCapture();
    }

    if (!failure && (!capture || Object.keys(capture.renders).length === 0)) {
      failure =
        'No render probes were captured. Run yarn performance:swaps:prepare before starting the scenario.';
    }

    const summary = capture ? summarizeCapture(capture, phases) : null;
    const artifact: SwapsPerformanceArtifact = {
      schemaVersion: 1,
      run: {
        id: runId,
        scenario: 'open-swaps-fetch-one-eth-quote',
        createdAt: createdAt.toISOString(),
        commit: getCommit(),
        platform: 'ios-simulator',
        metroPort,
        status: failure ? 'failed' : 'passed',
      },
      preconditions: {
        walletUnlocked,
        sourceTokenText,
        destinationToken: 'USDC',
        sourceAmount: '1',
      },
      phases,
      capture,
      summary,
      failure,
    };
    const paths = writeArtifact(artifact);

    log(`JSON artifact: ${paths.jsonPath}`);
    log(`Markdown report: ${paths.markdownPath}`);
    runMm(['cleanup'], true);
  }

  if (failure) {
    throw new Error(failure);
  }
}

runScenario().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${LOG_PREFIX} ${sanitizeFailure(message)}\n`);
  process.exitCode = 1;
});
