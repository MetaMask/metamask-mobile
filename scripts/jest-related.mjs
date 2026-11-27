#!/usr/bin/env node
/**
 * Runs one of the Jest scripts in package.json (test:unit, test:view:ci,
 * test:integration:ci) on only the suites related to the files a pull request
 * changed. CI uses it instead of repeating those scripts' flags in the workflow.
 *
 * Usage: node scripts/jest-related.mjs <package-script> [jest args...]
 * Env:   JEST_RELATED_FILES  newline-separated changed source files
 *
 * The suites to run are the ones `jest --findRelatedTests` returns for the
 * changed files, intersected with the suites the package script itself selects
 * (`yarn <script> --listTests`). The intersection keeps the related run inside
 * exactly the same test set as the full run: the script's roots and ignore
 * patterns decide what counts as a suite, so a related file such as a Playwright
 * spec cannot slip in. Everything after the script name is passed on to Jest
 * unchanged, so the caller adds the same shard, coverage and reporter flags it
 * gives the full run.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  buildRunArgs,
  describeJestScript,
  selectSuites,
} from './jest-related-plan.mjs';

function fail(message) {
  console.error(`jest-related: ${message}`);
  process.exit(1);
}

function listSuites(yarnArgs) {
  const result = spawnSync('yarn', [...yarnArgs, '--listTests'], {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'inherit'],
  });
  if (result.status !== 0) {
    fail(`'yarn ${yarnArgs[0]} ... --listTests' exited with ${result.status}`);
  }
  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => path.isAbsolute(line));
}

function main(argv, env) {
  const [scriptName, ...passthrough] = argv;
  if (!scriptName) {
    fail('usage: jest-related.mjs <package-script> [jest args...]');
  }
  const files = (env.JEST_RELATED_FILES ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (files.length === 0) {
    fail('JEST_RELATED_FILES is empty');
  }
  const { scripts } = JSON.parse(readFileSync('package.json', 'utf8'));
  const command = scripts[scriptName];
  if (!command) {
    fail(`package.json has no script '${scriptName}'`);
  }

  const jestScript = describeJestScript(scriptName, command);
  const all = listSuites([scriptName]);
  if (all.length === 0) {
    fail(`'${scriptName}' lists no test suites`);
  }
  const related = listSuites([
    ...jestScript.base,
    '--findRelatedTests',
    ...files,
  ]);
  const selected = selectSuites(related, all);
  console.log(
    `jest-related: ${selected.length} of ${all.length} suites selected for ${files.length} changed files`,
  );

  const args = buildRunArgs(
    scriptName,
    passthrough,
    selected,
    all.length,
    jestScript,
  );
  const result = spawnSync('yarn', args, { stdio: 'inherit' });
  process.exit(result.status ?? 1);
}

main(process.argv.slice(2), process.env);
