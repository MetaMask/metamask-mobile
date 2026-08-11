/* eslint-disable import-x/no-nodejs-modules */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseSwapsPerformanceArtifact } from '../analysis/artifact';
import { formatArtifactMarkdown } from '../analysis/markdown-report';

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

function readOption(argv: string[], option: string): string | null {
  const index = argv.indexOf(option);
  if (index === -1) {
    return null;
  }
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${option} requires a value`);
  }
  return value;
}

function resolveArtifactPath(argv: string[]): string {
  const optionsWithValues = new Set(['--output']);
  const positional = argv.find(
    (argument, index) =>
      !argument.startsWith('--') &&
      (index === 0 || !optionsWithValues.has(argv[index - 1])),
  );
  return positional ? resolve(process.cwd(), positional) : findLatestArtifact();
}

export function analyzeSwapsPerformance(argv: string[]): void {
  const artifactPath = resolveArtifactPath(argv);
  const outputPath = readOption(argv, '--output');
  const parsedJson: unknown = JSON.parse(readFileSync(artifactPath, 'utf8'));
  const artifact = parseSwapsPerformanceArtifact(parsedJson);
  if (!artifact) {
    throw new Error(`Invalid Swaps performance artifact: ${artifactPath}`);
  }

  const report = formatArtifactMarkdown(artifact);
  process.stdout.write(`${LOG_PREFIX} analyzing ${artifactPath}\n`);
  if (outputPath) {
    const resolvedOutputPath = resolve(process.cwd(), outputPath);
    writeFileSync(resolvedOutputPath, report);
    process.stdout.write(
      `${LOG_PREFIX} Markdown report: ${resolvedOutputPath}\n`,
    );
    return;
  }
  process.stdout.write(`\n${report}`);
}
