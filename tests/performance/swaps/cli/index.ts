/* eslint-disable import-x/no-nodejs-modules */
import { analyzeSwapsPerformance } from './analyze';
import { parseSwapsPerformanceCommand } from './command';
import { runInstrumentationCommand } from './instrumentation';
import { runSwapsPerformanceScenario } from './run-scenario';

const LOG_PREFIX = '[SWAPS_PERF_ANALYSIS]';

async function run(): Promise<void> {
  const command = parseSwapsPerformanceCommand(process.argv.slice(2));

  if (command.action === 'run') {
    await runSwapsPerformanceScenario(command.scenario, command.args);
    return;
  }
  if (command.action === 'analyze') {
    analyzeSwapsPerformance(command.args);
    return;
  }
  runInstrumentationCommand(command.action);
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${LOG_PREFIX} ${message}\n`);
  process.exitCode = 1;
});
