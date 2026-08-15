/* eslint-disable import-x/no-nodejs-modules */
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, resolve } from 'node:path';
import { parseSwapsPerformanceArtifact } from '../analysis/artifact';
import { compareSwapsPerformanceArtifacts } from '../analysis/comparison';
import { formatComparisonMarkdown } from '../analysis/comparison-report';

const LOG_PREFIX = '[SWAPS_PERF_ANALYSIS]';

export function resolveComparisonDirectory(argv: string[]): string {
  if (argv.length !== 1 || argv[0].startsWith('--')) {
    throw new Error('Compare accepts exactly one scenario folder path');
  }
  return resolve(process.cwd(), argv[0]);
}

export function compareSwapsPerformanceRuns(argv: string[]): void {
  const directory = resolveComparisonDirectory(argv);
  if (!existsSync(directory)) {
    throw new Error(`Comparison folder does not exist: ${directory}`);
  }
  if (!statSync(directory).isDirectory()) {
    throw new Error(`Comparison path is not a directory: ${directory}`);
  }

  const artifactPaths = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => resolve(directory, entry.name))
    .sort();
  if (artifactPaths.length === 0) {
    throw new Error(`No JSON artifacts found directly in ${directory}`);
  }

  const artifacts = artifactPaths.map((artifactPath) => {
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(readFileSync(artifactPath, 'utf8'));
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`Invalid JSON in ${basename(artifactPath)}: ${detail}`);
    }

    const artifact = parseSwapsPerformanceArtifact(parsedJson);
    if (!artifact) {
      throw new Error(
        `Invalid Swaps performance artifact: ${basename(artifactPath)}`,
      );
    }
    return artifact;
  });

  const comparison = compareSwapsPerformanceArtifacts(artifacts);
  const outputPath = resolve(directory, 'comparison.md');
  writeFileSync(outputPath, formatComparisonMarkdown(comparison));
  process.stdout.write(
    `${LOG_PREFIX} compared ${comparison.successfulRuns.length} successful run(s) and ${comparison.failedRuns.length} failed run(s)\n`,
  );
  process.stdout.write(`${LOG_PREFIX} Comparison report: ${outputPath}\n`);
}
