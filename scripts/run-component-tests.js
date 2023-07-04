#!/usr/bin/env node

const path = require('path');
const { promises: fs } = require('fs');
const execa = require('execa');
const { chunk } = require('lodash');

const rootProjectDirectory = path.resolve(__dirname, '..');
const componentPath = path.join(
  rootProjectDirectory,
  'app',
  'components',
  'UI',
);

const TESTS_PER_PROCESS = 10;

/**
 * Run component UI tests in groups using subprocesses.
 *
 * This is a temporary fix for Jest memory leaks affecting Node.js >= 16.
 * After updating to Jest v29 we should delete this script and use the Jest
 * configuration option `workerIdleMemoryLimit` instead.
 */
async function main() {
  const componentDirectories = await fs.readdir(componentPath);

  const testGroups = chunk(componentDirectories, TESTS_PER_PROCESS);
  for (const paths of testGroups) {
    await execa(
      'yarn',
      ['jest', ...paths, '--forceExit', '--passWithNoTests'],
      {
        cwd: rootProjectDirectory,
        stdio: 'inherit',
      },
    );
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
