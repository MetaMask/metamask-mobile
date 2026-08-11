/* eslint-disable import-x/no-nodejs-modules */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  formatArtifactMarkdown,
  parseSwapsPerformanceArtifact,
} from './diagnostics';

const LOG_PREFIX = '[SWAPS_PERF_ANALYSIS]';
const OUTPUT_DIRECTORY = resolve(
  process.cwd(),
  'test-reports/swaps-performance',
);

function findLatestArtifact(): string {
  const candidates = readdirSync(OUTPUT_DIRECTORY)
    .filter((name) => name.endsWith('.json'))
    .map((name) => resolve(OUTPUT_DIRECTORY, name))
    .sort(
      (first, second) => statSync(second).mtimeMs - statSync(first).mtimeMs,
    );

  const latest = candidates[0];
  if (!latest) {
    throw new Error(`No JSON artifacts found in ${OUTPUT_DIRECTORY}`);
  }
  return latest;
}

function resolveArtifactPath(argv: string[]): string {
  const suppliedPath = argv.find((argument) => argument !== '--latest');
  return suppliedPath
    ? resolve(process.cwd(), suppliedPath)
    : findLatestArtifact();
}

function run(): void {
  const artifactPath = resolveArtifactPath(process.argv.slice(2));
  const parsedJson: unknown = JSON.parse(readFileSync(artifactPath, 'utf8'));
  const artifact = parseSwapsPerformanceArtifact(parsedJson);
  if (!artifact) {
    throw new Error(`Invalid Swaps performance artifact: ${artifactPath}`);
  }

  process.stdout.write(`${LOG_PREFIX} analyzing ${artifactPath}\n\n`);
  process.stdout.write(formatArtifactMarkdown(artifact));
}

try {
  run();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${LOG_PREFIX} ${message}\n`);
  process.exitCode = 1;
}
