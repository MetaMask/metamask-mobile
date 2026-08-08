#!/usr/bin/env node
/* eslint-disable import-x/no-nodejs-modules */
/**
 * Prints the appium-xcuitest-driver version for WDA cache keys.
 * Source of truth: root package.json devDependencies (no yarn install required).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

const raw =
  pkg.devDependencies?.['appium-xcuitest-driver'] ??
  pkg.dependencies?.['appium-xcuitest-driver'];

if (!raw) {
  console.error(
    'appium-xcuitest-driver not found in package.json dependencies',
  );
  process.exit(1);
}

// Normalize semver range prefixes (^, ~, >=) — we pin exact versions today but
// this keeps the cache key stable if a range is ever used.
const version = String(raw).replace(/^[\^~>=<]+/, '');
process.stdout.write(version);
