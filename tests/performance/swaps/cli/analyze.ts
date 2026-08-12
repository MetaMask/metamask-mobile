/* eslint-disable import-x/no-nodejs-modules */
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { parse, resolve } from 'node:path';
import { parseSwapsPerformanceArtifact } from '../analysis/artifact';
import { formatArtifactMarkdown } from '../analysis/markdown-report';

const LOG_PREFIX = '[SWAPS_PERF_ANALYSIS]';
const OUTPUT_DIRECTORY = resolve(
  process.cwd(),
  'test-reports/swaps-performance',
);

function findJsonArtifacts(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      return findJsonArtifacts(entryPath);
    }
    return entry.isFile() && entry.name.endsWith('.json') ? [entryPath] : [];
  });
}

export function findLatestArtifact(outputDirectory = OUTPUT_DIRECTORY): string {
  const candidates = findJsonArtifacts(outputDirectory).sort(
    (first, second) => statSync(second).mtimeMs - statSync(first).mtimeMs,
  );

  const latest = candidates[0];
  if (!latest) {
    throw new Error(`No JSON artifacts found in ${outputDirectory}`);
  }
  return latest;
}

function resolveArtifactPath(argv: string[]): string {
  if (argv.length === 0 || (argv.length === 1 && argv[0] === '--latest')) {
    return findLatestArtifact();
  }
  if (argv.length === 1 && !argv[0].startsWith('--')) {
    return resolve(process.cwd(), argv[0]);
  }
  throw new Error('Analyze accepts one artifact path or --latest');
}

export function resolveMarkdownReportPath(artifactPath: string): string {
  const artifact = parse(artifactPath);
  return resolve(artifact.dir, `${artifact.name}.md`);
}

export function analyzeSwapsPerformance(argv: string[]): void {
  const artifactPath = resolveArtifactPath(argv);
  const parsedJson: unknown = JSON.parse(readFileSync(artifactPath, 'utf8'));
  const artifact = parseSwapsPerformanceArtifact(parsedJson);
  if (!artifact) {
    throw new Error(`Invalid Swaps performance artifact: ${artifactPath}`);
  }

  const report = formatArtifactMarkdown(artifact);
  const outputPath = resolveMarkdownReportPath(artifactPath);
  process.stdout.write(`${LOG_PREFIX} analyzing ${artifactPath}\n`);
  writeFileSync(outputPath, report);
  process.stdout.write(`${LOG_PREFIX} Markdown report: ${outputPath}\n`);
}
