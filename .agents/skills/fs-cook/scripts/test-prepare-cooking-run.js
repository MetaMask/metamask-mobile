#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { mkdtempSync, mkdirSync, writeFileSync, readFileSync } = fs;
const { spawnSync } = require('node:child_process');

function testTextSource() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'fs-cook-prepare-text-'));
  const repoRoot = path.join(root, 'metamask-mobile-4');
  mkdirSync(repoRoot, { recursive: true });

  const script = path.resolve(__dirname, 'prepare-cooking-run.js');
  const outputDir = path.join(root, 'out-text');
  const result = spawnSync(
    process.execPath,
    [
      script,
      '--repo-root',
      repoRoot,
      '--source-kind',
      'text',
      '--source-ref',
      'demo-text',
      '--source-text',
      'Investigate reverse position pricing',
      '--output-dir',
      outputDir,
    ],
    {
      encoding: 'utf8',
      cwd: repoRoot,
    },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.stdout.trim(), outputDir);
  assert.ok(fs.existsSync(path.join(outputDir, 'TASK.md')));
  assert.ok(fs.existsSync(path.join(outputDir, 'SOURCE-BUNDLE.md')));
  const task = readFileSync(path.join(outputDir, 'TASK.md'), 'utf8');
  assert.match(task, /SOURCE_KIND: text/);
  assert.match(task, /SOURCE_REF: demo-text/);
  const bundle = readFileSync(path.join(outputDir, 'SOURCE-BUNDLE.md'), 'utf8');
  assert.match(bundle, /Source Kind: Text/);
  assert.match(bundle, /Investigate reverse position pricing/);
}

function testFileSource() {
  const root = mkdtempSync(path.join(os.tmpdir(), 'fs-cook-prepare-file-'));
  const repoRoot = path.join(root, 'metamask-extension-1');
  mkdirSync(repoRoot, { recursive: true });
  const sourcePath = path.join(root, 'source.txt');
  writeFileSync(sourcePath, 'Fix stale market pricing\n', 'utf8');

  const script = path.resolve(__dirname, 'prepare-cooking-run.js');
  const outputDir = path.join(root, 'out-file');
  const result = spawnSync(
    process.execPath,
    [
      script,
      '--repo-root',
      repoRoot,
      '--source-kind',
      'file',
      '--source-ref',
      sourcePath,
      '--output-dir',
      outputDir,
    ],
    {
      encoding: 'utf8',
      cwd: repoRoot,
    },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  const bundle = readFileSync(path.join(outputDir, 'SOURCE-BUNDLE.md'), 'utf8');
  assert.match(bundle, /Source Kind: File/);
  assert.match(bundle, /Fix stale market pricing/);
}

function main() {
  testTextSource();
  testFileSource();
  process.stdout.write('prepare-cooking-run tests: ok\n');
}

main();
