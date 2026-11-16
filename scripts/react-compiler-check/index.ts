import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { relative, resolve as resolvePath } from 'node:path';
import { Worker } from 'node:worker_threads';
import {
  type Baseline,
  type FileResult,
  compareWithBaseline,
  parseBaseline,
  selectCheckedPaths,
  serializeBaseline,
  updateBaseline,
} from './baseline';
import { USAGE, parseCliArgs } from './cli-args';
import { isInScope } from './file-scope';
import {
  BASELINE_FILE,
  DASHBOARD_URL,
  formatImprovements,
  formatRegressions,
  formatSummary,
} from './report';

function git(root: string, args: string[]): string[] {
  return execFileSync('git', args, { cwd: root, maxBuffer: 256 * 1024 * 1024 })
    .toString()
    .split('\0')
    .filter(Boolean);
}

function selectFiles(
  root: string,
  explicitFiles: string[],
  changedSince: string | null,
): string[] {
  if (explicitFiles.length > 0) {
    const cwd = process.env.INIT_CWD ?? process.cwd();
    return explicitFiles.map((file) => relative(root, resolvePath(cwd, file)).replace(/\\/g, '/'));
  }
  if (changedSince) {
    return [
      ...git(root, ['diff', '-z', '--name-only', '--no-renames', `${changedSince}...HEAD`, '--']),
      ...git(root, ['diff', '-z', '--name-only', '--no-renames', 'HEAD', '--']),
      ...git(root, ['ls-files', '-z', '--others', '--exclude-standard', 'app']),
    ];
  }
  return git(root, ['ls-files', '-z', '--cached', '--others', '--exclude-standard', 'app']);
}

function compileInWorkers(root: string, files: string[]): Promise<FileResult[]> {
  const workerCount = Math.max(
    1,
    Math.min(
      Number(process.env.REACT_COMPILER_CHECK_WORKERS) || availableParallelism() - 1,
      Math.ceil(files.length / 50),
    ),
  );
  const chunks: string[][] = Array.from({ length: workerCount }, () => []);
  files.forEach((file, index) => chunks[index % workerCount].push(file));
  return Promise.all(
    chunks.map(
      (chunk) =>
        new Promise<FileResult[]>((resolve, reject) => {
          const worker = new Worker(new URL('./worker.ts', import.meta.url), {
            workerData: { files: chunk, root },
          });
          worker.once('message', resolve);
          worker.once('error', reject);
          worker.once('exit', (code) => {
            if (code !== 0) {
              reject(new Error(`React Compiler worker exited with code ${code}.`));
            }
          });
        }),
    ),
  ).then((results) => results.flat());
}

async function main(): Promise<number> {
  const started = Date.now();
  const args = parseCliArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  const root = execFileSync('git', ['rev-parse', '--show-toplevel']).toString().trim();
  const baselinePath = `${root}/${BASELINE_FILE}`;
  const baseline: Baseline = existsSync(baselinePath)
    ? parseBaseline(readFileSync(baselinePath, 'utf8'))
    : {};
  const fullRun = args.files.length === 0 && args.changed === null;
  const candidates = [...new Set(selectFiles(root, args.files, args.changed))];
  const selected = candidates.filter(isInScope);
  if (args.files.length > 0) {
    const skipped = candidates.filter((file) => !isInScope(file));
    if (skipped.length > 0) {
      process.stderr.write(
        `Skipped ${skipped.length} file(s) outside the check's scope (app/ source files, no tests or mocks):\n${skipped.map((file) => `  ${file}`).join('\n')}\n\n`,
      );
    }
  }
  const files = selected.filter((file) => existsSync(`${root}/${file}`)).sort();
  if (args.files.length > 0) {
    const missing = selected.filter((file) => !files.includes(file));
    if (missing.length > 0) {
      process.stderr.write(
        `Not found, so not compiled:\n${missing.map((file) => `  ${file}`).join('\n')}\n\n`,
      );
    }
  }
  const checkedPaths = selectCheckedPaths(selected, baseline, fullRun);

  const results = await compileInWorkers(root, files);
  const comparison = compareWithBaseline(results, baseline, checkedPaths);
  const nextBaseline = updateBaseline(results, baseline, checkedPaths);
  const regressions = formatRegressions(comparison);
  const improvements = formatImprovements(comparison);

  if (args.update) {
    if (comparison.regressions.length > 0 && !args.allowNew) {
      process.stderr.write(
        `${regressions}\n\n--update refused: it only shrinks the baseline. Adding failures needs --allow-new and a reviewer's approval.\n`,
      );
      process.stdout.write(`${formatSummary(baseline, nextBaseline, files.length, Date.now() - started)}\n`);
      return 1;
    }
    writeFileSync(baselinePath, serializeBaseline(nextBaseline));
    process.stdout.write(
      `Updated ${BASELINE_FILE}.\n${formatSummary(baseline, nextBaseline, files.length, Date.now() - started)}\n`,
    );
    return 0;
  }

  const output = [regressions, improvements].filter(Boolean).join('\n\n');
  if (output) {
    process.stderr.write(`${output}\n\n`);
  }
  process.stdout.write(
    `${formatSummary(baseline, nextBaseline, files.length, Date.now() - started)}\nDashboard: ${DASHBOARD_URL}\n`,
  );
  if (!output) {
    process.stdout.write('✔ No new React Compiler failures.\n');
  }
  return output ? 1 : 0;
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error: Error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 2;
  },
);
