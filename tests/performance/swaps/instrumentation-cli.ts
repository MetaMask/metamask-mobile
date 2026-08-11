/* eslint-disable import-x/no-nodejs-modules */
import {
  cleanupInstrumentation,
  getInstrumentationStatus,
  prepareInstrumentation,
} from './instrumentation';

const LOG_PREFIX = '[SWAPS_PERF_ANALYSIS]';

function run(): void {
  const command = process.argv[2];
  const repoRoot = process.cwd();

  if (command === 'status') {
    process.stdout.write(
      `${LOG_PREFIX} instrumentation is ${getInstrumentationStatus(repoRoot)}\n`,
    );
    return;
  }

  const result =
    command === 'prepare'
      ? prepareInstrumentation(repoRoot)
      : command === 'cleanup'
        ? cleanupInstrumentation(repoRoot)
        : null;

  if (!result) {
    throw new Error('Expected prepare, cleanup, or status');
  }

  const changeSummary =
    result.changedFiles.length === 0
      ? 'no source changes required'
      : `${result.changedFiles.length} files updated`;
  process.stdout.write(
    `${LOG_PREFIX} instrumentation is ${result.status}; ${changeSummary}\n`,
  );
}

try {
  run();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${LOG_PREFIX} ${message}\n`);
  process.exitCode = 1;
}
