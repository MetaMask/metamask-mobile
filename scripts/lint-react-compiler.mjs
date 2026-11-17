import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const BASELINE = 'scripts/lint-react-compiler-baseline.json';
const SKILL =
  'https://github.com/MetaMask/skills/tree/main/domains/assets/skills/react-compiler-migration';

export function isTestOrMock(filePath) {
  const segments = filePath.replace(/\\/g, '/').split('/');
  const name = segments.at(-1) ?? '';
  const dirs = segments.slice(0, -1);
  const test =
    dirs.some((part) =>
      /^(?:__tests__|tests?|e2e|__e2e__|specs?)$/i.test(part),
    ) || /\.(?:test|spec|e2e)\.[^.]+$/i.test(name);
  const mock =
    dirs.some((part) => /^(?:__mocks__|mocks?)$/i.test(part)) ||
    /(?:^|\.)(?:mock|mocks)\.[^.]+$/i.test(name) ||
    /^(?:mock[-_]|Mock[A-Z])/.test(name);
  return test || mock;
}

export function collectFailures(report, dir) {
  const failures = new Map();
  const add = (file, line, column, reason) => {
    const key = path.posix.join(dir, file.replace(/\\/g, '/'));
    if (isTestOrMock(key)) return;
    failures.set(key, [...(failures.get(key) ?? []), { line, column, reason }]);
  };
  for (const file of report.files) {
    for (const event of [...file.failed, ...(file.skipped ?? [])]) {
      const options = event.detail?.options ?? {};
      const loc = options.details?.find((d) => d.loc)?.loc ?? event.fnLoc;
      const reason = options.reason ?? event.reason ?? 'Unknown reason';
      add(
        file.path,
        loc?.start.line ?? 0,
        (loc?.start.column ?? 0) + 1,
        reason,
      );
    }
  }
  for (const error of report.errors) add(error.path, 0, 0, error.message);
  return failures;
}

export function compare(baseline, counts) {
  const files = new Set([...Object.keys(baseline), ...Object.keys(counts)]);
  const regressions = [];
  const improvements = [];
  for (const file of [...files].sort()) {
    const before = baseline[file] ?? 0;
    const after = counts[file] ?? 0;
    if (after > before) regressions.push({ file, before, after });
    if (after < before) improvements.push({ file, before, after });
  }
  return { regressions, improvements };
}

const sum = (counts) => Object.values(counts).reduce((a, b) => a + b, 0);

function main(args) {
  const started = Date.now();
  const ROOT = process.cwd();
  const require = createRequire(path.join(ROOT, 'package.json'));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'react-compiler-'));
  const output = path.join(tmp, 'report.json');
  const cli = spawnSync(
    process.execPath,
    [
      require.resolve('react-compiler-marker/bin/cli.js'),
      '--babel-plugin-path',
      require.resolve('babel-plugin-react-compiler'),
      '--format',
      'json',
      '--output',
      output,
      'app',
    ],
    { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] },
  );
  if (cli.status !== 0 && cli.status !== 1)
    throw new Error(
      `react-compiler-marker exited with ${cli.status ?? cli.signal}`,
    );
  const failures = collectFailures(
    JSON.parse(fs.readFileSync(output, 'utf8')),
    'app',
  );
  fs.rmSync(tmp, { recursive: true, force: true });
  const counts = Object.fromEntries(
    [...failures]
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([f, l]) => [f, l.length]),
  );
  const baseline = JSON.parse(
    fs.readFileSync(path.join(ROOT, BASELINE), 'utf8'),
  );
  const { regressions, improvements } = compare(baseline, counts);
  let ok = regressions.length === 0 && improvements.length === 0;
  for (const { file, before, after } of regressions) {
    console.error(`✖ ${file}: ${before} → ${after} React Compiler failure(s)`);
    for (const f of failures.get(file))
      console.error(`  ${file}:${f.line}:${f.column}  ${f.reason}`);
  }
  if (regressions.length)
    console.error(
      `\nFix these with the react-compiler-migration skill: ${SKILL}\nDo not silence them with eslint-disable or "use no memo". If approved in review: yarn lint:react-compiler --update --allow-new\n`,
    );
  if (
    args.includes('--update') &&
    (regressions.length === 0 || args.includes('--allow-new'))
  ) {
    fs.writeFileSync(
      path.join(ROOT, BASELINE),
      `${JSON.stringify(counts, null, 2)}\n`,
    );
    console.log(`Updated ${BASELINE}.`);
    ok = true;
  } else if (improvements.length) {
    for (const { file, before, after } of improvements)
      console.error(`✔ ${file}: ${before} → ${after}`);
    console.error(
      `\n${improvements.length} file(s) improved. Run \`yarn lint:react-compiler --update\` and commit ${BASELINE}.\n`,
    );
  }
  const files = Object.keys(counts).length;
  const delta = sum(counts) - sum(baseline);
  console.log(
    `React Compiler: ${files} files / ${sum(counts)} failures (baseline ${Object.keys(baseline).length} / ${sum(baseline)}, ${delta >= 0 ? '+' : ''}${delta}) in ${((Date.now() - started) / 1000).toFixed(1)}s`,
  );
  process.exitCode = ok ? 0 : 1;
}

if (process.argv[1]?.endsWith('lint-react-compiler.mjs')) {
  main(process.argv.slice(2));
}
