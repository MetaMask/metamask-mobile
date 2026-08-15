/* eslint-disable import-x/no-nodejs-modules */
import {
  cleanupInstrumentation,
  getInstrumentationStatus,
  getPrepareWriteOrder,
  InstrumentationStatus,
  prepareInstrumentation,
} from '../capture/source-instrumentation';

const LOG_PREFIX = '[SWAPS_PERF_ANALYSIS]';

export type InstrumentationCommand = 'prepare' | 'status' | 'cleanup';

/** Formats the complete prepare target list for terminal output. */
export function formatInstrumentedFiles(filePaths: string[]): string {
  return [
    `${LOG_PREFIX} instrumented files (${filePaths.length}):`,
    ...filePaths.map((filePath) => `${LOG_PREFIX} - ${filePath}`),
  ].join('\n');
}

/** Formats an internal instrumentation state as explicit user-facing text. */
export function formatInstrumentationStatus(
  status: InstrumentationStatus,
): string {
  if (status === 'not-installed') {
    return 'instrumentation is not installed; all temporary probes and generated files are removed';
  }
  if (status === 'prepared') {
    return 'instrumentation is prepared; temporary probes and the generated diagnostics helper are installed';
  }
  return 'instrumentation is partial; manual inspection is required before continuing';
}

export function runInstrumentationCommand(
  command: InstrumentationCommand,
): void {
  const repoRoot = process.cwd();

  if (command === 'status') {
    process.stdout.write(
      `${LOG_PREFIX} ${formatInstrumentationStatus(
        getInstrumentationStatus(repoRoot),
      )}\n`,
    );
    return;
  }

  const result =
    command === 'prepare'
      ? prepareInstrumentation(repoRoot)
      : cleanupInstrumentation(repoRoot);

  const changeSummary =
    result.changedFiles.length === 0
      ? 'no source changes required'
      : `${result.changedFiles.length} files updated`;
  const operationSummary =
    command === 'prepare'
      ? 'instrumentation prepared'
      : 'instrumentation removed';
  process.stdout.write(`${LOG_PREFIX} ${operationSummary}; ${changeSummary}\n`);
  if (command === 'prepare') {
    process.stdout.write(
      `${formatInstrumentedFiles(getPrepareWriteOrder())}\n`,
    );
  }
}
