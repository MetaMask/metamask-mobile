/**
 * Stage 2 runner — one ai-analyzer invocation per unit test file.
 *
 * The analyzer writes `mode.outputFile` with no `--output` flag, so each
 * parallel child gets its own `--config` dir (prepareRunConfigDir) whose
 * mode.yaml points at an absolute per-run path. Delete that shim when
 * MetaMask/ai-analyzer ships `--output`.
 */
import * as core from '@actions/core';
import { spawn } from 'child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  symlinkSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';
import type {
  AnalyzerRunRecord,
  AnalyzerRunStatus,
  Finding as AiFinding,
  HistoryFile,
} from './flaky-types';

export const DEFAULT_MAX_FILES = 10;
export const DEFAULT_MAX_ATTEMPTS = 2;
export const DEFAULT_CONCURRENCY = 3;
export const MODE_ID = 'flaky-unit-test-analysis';

export type { AnalyzerRunRecord, AnalyzerRunStatus, AiFinding };

export type AnalyzerOutput = {
  analyzedFiles?: string[];
  findings?: AiFinding[];
  confidence?: number;
  reasoning?: string;
};

export type MergedAiAnalysis = {
  analyzedFiles: string[];
  findings: AiFinding[];
  confidence: number;
  reasoning: string;
  runs: AnalyzerRunRecord[];
  maxFiles: number;
};

export type RunClassification = 'reviewed' | 'fallback' | 'error';

export type RunAnalyzerResult = {
  exitCode: number;
  output: AnalyzerOutput | null;
};

export type RunAnalyzer = (
  file: string,
  configDir: string,
  outputPath: string,
) => Promise<RunAnalyzerResult>;

export type FileRunResult = AnalyzerRunRecord & {
  output: AnalyzerOutput | null;
};

export type PrepareRunConfigDirInput = {
  runIndex: number;
  tempRoot: string;
  sourceConfigDir: string;
  outputPath: string;
};

export type HistoryFlakyFile = Pick<HistoryFile, 'path' | 'flaky'>;

export function historicallyFlakyPaths(
  files: HistoryFlakyFile[] | undefined,
): Set<string> {
  return new Set(
    (files ?? []).filter((file) => file.flaky).map((file) => file.path),
  );
}

/**
 * Input is files that still need Stage 2 (`needsAnalysis`). Historically
 * flaky paths go first so the per-run cap prefers known flakes. Already
 * reviewed unchanged files are not in this list — Stage 3 keeps their
 * prior findings.
 */
export function orderFilesForAnalysis(
  files: string[],
  historicallyFlaky: Set<string>,
): string[] {
  const flaky = files.filter((file) => historicallyFlaky.has(file));
  const rest = files.filter((file) => !historicallyFlaky.has(file));
  return [...flaky, ...rest];
}

export function partitionByCap(
  files: string[],
  maxFiles: number,
): { toRun: string[]; skipped: string[] } {
  const cap = Math.max(0, maxFiles);
  return {
    toRun: files.slice(0, cap),
    skipped: files.slice(cap),
  };
}

export function classifyRun(
  file: string,
  result: RunAnalyzerResult,
  conservativeFallback: AnalyzerOutput,
): RunClassification {
  if (result.exitCode !== 0 || result.output === null) {
    return 'error';
  }
  if (isSameAnalyzerOutput(result.output, conservativeFallback)) {
    return 'fallback';
  }
  const analyzed = result.output.analyzedFiles ?? [];
  if (analyzed.includes(file)) {
    return 'reviewed';
  }
  return 'fallback';
}

export function mergeRuns(
  results: FileRunResult[],
  maxFiles: number,
): MergedAiAnalysis {
  const reviewed = results.filter((result) => result.status === 'reviewed');
  const analyzedFiles = reviewed.map((result) => result.file);
  const findings = reviewed.flatMap((result) => result.output?.findings ?? []);
  const confidences = reviewed
    .map((result) => result.output?.confidence)
    .filter((value): value is number => typeof value === 'number');
  const confidence =
    confidences.length === 0
      ? 0
      : Math.round(
          confidences.reduce((sum, value) => sum + value, 0) /
            confidences.length,
        );
  const reasoning = results
    .map((result) => `${result.file}: ${result.status}`)
    .join('; ');
  return {
    analyzedFiles,
    findings,
    confidence,
    reasoning,
    runs: results.map(({ file, status, attempts, durationMs }) => ({
      file,
      status,
      attempts,
      durationMs,
    })),
    maxFiles,
  };
}

export function stepOutputsFromArtifact(artifact: MergedAiAnalysis): {
  reviewed_count: string;
  did_not_complete_files: string;
  skipped_cap_files: string;
} {
  return {
    reviewed_count: String(
      artifact.runs.filter((run) => run.status === 'reviewed').length,
    ),
    did_not_complete_files: artifact.runs
      .filter((run) => run.status === 'did_not_complete')
      .map((run) => run.file)
      .join(' '),
    skipped_cap_files: artifact.runs
      .filter((run) => run.status === 'skipped_cap')
      .map((run) => run.file)
      .join(' '),
  };
}

export async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }
  const results: R[] = new Array(items.length);
  let next = 0;
  const workerCount = Math.min(Math.max(limit, 1), items.length);

  async function worker(): Promise<void> {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}

/**
 * Isolated `--config` tree so parallel analyzer processes do not clobber
 * each other's `outputFile`. Remove once ai-analyzer accepts `--output`.
 */
export function prepareRunConfigDir(input: PrepareRunConfigDirInput): string {
  const configDir = join(input.tempRoot, `flaky-ai-config-${input.runIndex}`);
  const modeDest = join(configDir, 'modes', MODE_ID);
  mkdirSync(modeDest, { recursive: true });

  copyFileSync(
    join(input.sourceConfigDir, 'config.yaml'),
    join(configDir, 'config.yaml'),
  );

  const modeSrc = join(input.sourceConfigDir, 'modes', MODE_ID);
  for (const entry of readdirSync(modeSrc, { withFileTypes: true })) {
    if (!entry.isFile()) {
      continue;
    }
    copyFileSync(join(modeSrc, entry.name), join(modeDest, entry.name));
  }

  const modeYamlPath = join(modeDest, 'mode.yaml');
  const modeYaml = readFileSync(modeYamlPath, 'utf8');
  writeFileSync(
    modeYamlPath,
    rewriteModeOutputFile(modeYaml, input.outputPath),
  );

  const skillsSrc = join(input.sourceConfigDir, 'skills');
  const skillsDest = join(configDir, 'skills');
  if (existsSync(skillsSrc) && !existsSync(skillsDest)) {
    symlinkSync(skillsSrc, skillsDest);
  }

  return configDir;
}

export function rewriteModeOutputFile(
  yaml: string,
  outputPath: string,
): string {
  const line = `outputFile: ${JSON.stringify(outputPath)}`;
  if (/^outputFile:/m.test(yaml)) {
    return yaml.replace(/^outputFile:.*$/m, line);
  }
  return `${line}\n${yaml}`;
}

export type RunFlakyAiAnalysisInput = {
  filesToAnalyze: string[];
  historicallyFlaky: Set<string>;
  maxFiles: number;
  maxAttempts: number;
  concurrency: number;
  tempRoot: string;
  sourceConfigDir: string;
  runsDir: string;
  conservativeFallback: AnalyzerOutput;
  runAnalyzer: RunAnalyzer;
  prepareConfigDir?: (input: PrepareRunConfigDirInput) => string;
  now?: () => number;
  /** Called before the first run and after every file, so a timeout kill still leaves an artifact. */
  writeArtifact?: (artifact: MergedAiAnalysis) => void;
};

export type RunFlakyAiAnalysisResult = {
  artifact: MergedAiAnalysis;
  shouldFail: boolean;
  failMessage: string;
};

export async function runFlakyAiAnalysis(
  input: RunFlakyAiAnalysisInput,
): Promise<RunFlakyAiAnalysisResult> {
  const ordered = orderFilesForAnalysis(
    input.filesToAnalyze,
    input.historicallyFlaky,
  );
  const { toRun, skipped } = partitionByCap(ordered, input.maxFiles);
  const skippedResults: FileRunResult[] = skipped.map((file) => ({
    file,
    status: 'skipped_cap',
    attempts: 0,
    durationMs: 0,
    output: null,
  }));

  mkdirSync(input.runsDir, { recursive: true });
  const prepare = input.prepareConfigDir ?? prepareRunConfigDir;
  const now = input.now ?? Date.now;
  const maxAttempts = Math.max(1, input.maxAttempts);

  // Stage 3 must find an artifact even if this process is killed at its
  // timeout, so a complete one exists before the first analyzer starts and is
  // rewritten as each file lands. Pending files read as did_not_complete,
  // which is what Stage 3 already renders as "not reviewed".
  const pending = new Map<string, FileRunResult>(
    toRun.map((file) => [
      file,
      {
        file,
        status: 'did_not_complete',
        attempts: 0,
        durationMs: 0,
        output: null,
      },
    ]),
  );
  const publish = (): void => {
    input.writeArtifact?.(
      mergeRuns([...pending.values(), ...skippedResults], input.maxFiles),
    );
  };
  publish();

  const ran = await runWithConcurrency(
    toRun,
    input.concurrency,
    async (file, index) => {
      const outputPath = join(input.runsDir, `${index}.json`);
      const configDir = prepare({
        runIndex: index,
        tempRoot: input.tempRoot,
        sourceConfigDir: input.sourceConfigDir,
        outputPath,
      });
      const started = now();
      let attempts = 0;
      let last: RunAnalyzerResult = { exitCode: 1, output: null };
      let classification: RunClassification = 'error';
      while (attempts < maxAttempts) {
        attempts += 1;
        last = await input.runAnalyzer(file, configDir, outputPath);
        classification = classifyRun(file, last, input.conservativeFallback);
        if (classification === 'reviewed') {
          break;
        }
      }
      const status: AnalyzerRunStatus =
        classification === 'reviewed' ? 'reviewed' : 'did_not_complete';
      const result: FileRunResult = {
        file,
        status,
        attempts,
        durationMs: now() - started,
        output: last.output,
      };
      pending.set(file, result);
      publish();
      return result;
    },
  );

  const artifact = mergeRuns([...ran, ...skippedResults], input.maxFiles);
  const reviewed = artifact.runs.filter(
    (run) => run.status === 'reviewed',
  ).length;
  const shouldFail = input.filesToAnalyze.length > 0 && reviewed === 0;
  return {
    artifact,
    shouldFail,
    failMessage: shouldFail
      ? `AI analysis reviewed 0 of ${input.filesToAnalyze.length} requested file(s)`
      : '',
  };
}

function isSameAnalyzerOutput(
  left: AnalyzerOutput,
  right: AnalyzerOutput,
): boolean {
  return (
    jsonStable(left.analyzedFiles ?? []) ===
      jsonStable(right.analyzedFiles ?? []) &&
    jsonStable(left.findings ?? []) === jsonStable(right.findings ?? []) &&
    left.confidence === right.confidence &&
    left.reasoning === right.reasoning
  );
}

function jsonStable(value: unknown): string {
  return JSON.stringify(value);
}

const WORKSPACE_ROOT = process.env.GITHUB_WORKSPACE ?? process.cwd();

function readJsonFile<T>(path: string): T | null {
  if (!existsSync(path)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch {
    return null;
  }
}

function envInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function spawnAnalyzer({
  file,
  configDir,
  outputPath,
  aiAnalyzerDir,
  workspaceRoot,
  baseRef,
  githubOutputPath,
}: {
  file: string;
  configDir: string;
  outputPath: string;
  aiAnalyzerDir: string;
  workspaceRoot: string;
  baseRef: string;
  githubOutputPath: string;
}): Promise<RunAnalyzerResult> {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [
        '-r',
        'esbuild-register',
        join(aiAnalyzerDir, 'src/index.ts'),
        '--config',
        configDir,
        '--mode',
        MODE_ID,
        '--base-branch',
        `origin/${baseRef}`,
        '--changed-files',
        file,
        '--skip-scope',
      ],
      {
        cwd: workspaceRoot,
        env: {
          ...process.env,
          CI: 'true',
          GITHUB_OUTPUT: githubOutputPath,
        },
        stdio: 'inherit',
      },
    );
    child.on('error', () => {
      resolve({ exitCode: 1, output: null });
    });
    child.on('close', (code) => {
      resolve({
        exitCode: code ?? 1,
        output: readJsonFile<AnalyzerOutput>(outputPath),
      });
    });
  });
}

async function main(): Promise<void> {
  const workspaceRoot = WORKSPACE_ROOT;
  const sourceConfigDir = join(workspaceRoot, '.ai-pr-analyzer');
  const aiAnalyzerDir =
    process.env.AI_ANALYZER_DIR ?? join(workspaceRoot, '.ai-analyzer-action');
  const analyzerEntry = join(aiAnalyzerDir, 'src/index.ts');
  if (!existsSync(analyzerEntry)) {
    core.setFailed(`AI analyzer entrypoint missing: ${analyzerEntry}`);
    return;
  }

  const filesToAnalyze = (process.env.FILES_TO_ANALYZE ?? '')
    .split(/\s+/)
    .filter(Boolean);
  const history = readJsonFile<{ files?: HistoryFlakyFile[] }>(
    join(sourceConfigDir, 'flaky-history.json'),
  );
  const fallback = readJsonFile<{ conservative?: AnalyzerOutput }>(
    join(sourceConfigDir, 'modes', MODE_ID, 'fallback.json'),
  );
  const conservativeFallback: AnalyzerOutput = fallback?.conservative ?? {
    analyzedFiles: [],
    findings: [],
    confidence: 0,
    reasoning:
      'AI analysis did not complete. Historical signal (if any) is still reported by the deterministic history check.',
  };

  const tempRoot =
    process.env.RUNNER_TEMP ?? join(workspaceRoot, '.ai-pr-analyzer/tmp');
  mkdirSync(tempRoot, { recursive: true });
  const runsDir = join(sourceConfigDir, 'flaky-ai-analysis-runs');
  const artifactPath = join(sourceConfigDir, 'flaky-ai-analysis.json');
  mkdirSync(sourceConfigDir, { recursive: true });

  // Written through a temp file: a kill in the middle of a plain write would
  // leave Stage 3 parsing half a JSON document.
  const writeArtifact = (artifact: MergedAiAnalysis): void => {
    const tmp = `${artifactPath}.tmp`;
    writeFileSync(tmp, `${JSON.stringify(artifact, null, 2)}\n`);
    renameSync(tmp, artifactPath);
  };

  const result = await runFlakyAiAnalysis({
    filesToAnalyze,
    historicallyFlaky: historicallyFlakyPaths(history?.files),
    maxFiles: envInt('FLAKY_AI_MAX_FILES', DEFAULT_MAX_FILES),
    maxAttempts: envInt('FLAKY_AI_MAX_ATTEMPTS', DEFAULT_MAX_ATTEMPTS),
    concurrency: envInt('FLAKY_AI_CONCURRENCY', DEFAULT_CONCURRENCY),
    tempRoot,
    sourceConfigDir,
    runsDir,
    conservativeFallback,
    writeArtifact,
    runAnalyzer: (file, configDir, outputPath) =>
      spawnAnalyzer({
        file,
        configDir,
        outputPath,
        aiAnalyzerDir,
        workspaceRoot,
        baseRef: process.env.BASE_REF ?? 'main',
        githubOutputPath: join(
          tempRoot,
          `github-output-${Buffer.from(file).toString('hex').slice(0, 16)}`,
        ),
      }),
  });

  writeArtifact(result.artifact);

  const outputs = stepOutputsFromArtifact(result.artifact);
  core.setOutput('reviewed_count', outputs.reviewed_count);
  core.setOutput('did_not_complete_files', outputs.did_not_complete_files);
  core.setOutput('skipped_cap_files', outputs.skipped_cap_files);

  if (result.shouldFail) {
    core.setFailed(result.failMessage);
  }
}

if (require.main === module) {
  main().catch((error: Error) => {
    core.setFailed(error.message);
    process.exitCode = 1;
  });
}
