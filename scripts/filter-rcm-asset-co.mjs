#!/usr/bin/env node
/**
 * Filter a react-compiler-marker report down to Assets CODEOWNERS files.
 *
 *   node scripts/filter-rcm-asset-co.mjs
 *   node scripts/filter-rcm-asset-co.mjs --input rcm-raw.txt --output rcm-assets.txt
 *
 * Paths in rcm-raw.txt are relative to ./app (the marker was run on ./app).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS_OWNER = '@MetaMask/metamask-assets';

const args = parseArgs(process.argv.slice(2));
const inputPath = resolve(ROOT, args.input ?? 'rcm-raw.txt');
const outputPath = resolve(ROOT, args.output ?? 'rcm-assets.txt');
const reportPath = resolve(ROOT, args.report ?? 'rcm-assets-report.txt');
const owner = args.owner ?? ASSETS_OWNER;

const rules = parseCodeowners(readFileSync(resolve(ROOT, '.github/CODEOWNERS'), 'utf8'));
const raw = readFileSync(inputPath, 'utf8');
const failures = parseFailures(raw);
const assetFailures = failures.filter((entry) =>
  ownersFor(toRepoPath(entry.file), rules).includes(owner),
);

const filtered = formatFilteredReport({ owner, inputPath, assetFailures });
const report = formatSummaryReport({ owner, assetFailures });

writeFileSync(outputPath, filtered);
writeFileSync(reportPath, report);
process.stdout.write(report);

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--')) continue;
    out[key.slice(2)] = argv[i + 1];
    i += 1;
  }
  return out;
}

function parseCodeowners(text) {
  const parsed = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [pattern, ...owners] = trimmed.split(/\s+/);
    parsed.push({ pattern, owners, regex: codeownersToRegex(pattern) });
  }
  return parsed;
}

function codeownersToRegex(pattern) {
  const trimmed = pattern.replace(/\/+$/, '');
  let source = '';
  for (let i = 0; i < trimmed.length; i += 1) {
    const char = trimmed[i];
    if (char === '*' && trimmed[i + 1] === '*') {
      source += trimmed[i + 2] === '/' ? '(?:.*/)?' : '.*';
      i += trimmed[i + 2] === '/' ? 2 : 1;
    } else if (char === '*') {
      source += '[^/]*';
    } else if (char === '?') {
      source += '[^/]';
    } else {
      source += char.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  // Directory-style CODEOWNERS rules own the path and everything under it.
  return new RegExp(`^${source}(?:/.*)?$`);
}

function ownersFor(repoPath, codeownersRules) {
  let owners = [];
  for (const rule of codeownersRules) {
    if (rule.regex.test(repoPath)) owners = rule.owners;
  }
  return owners;
}

function toRepoPath(rcmFile) {
  const normalized = rcmFile.replace(/^\.\//, '');
  return normalized.startsWith('app/') ? normalized : `app/${normalized}`;
}

function parseFailures(text) {
  const entries = [];
  for (const line of text.split('\n')) {
    const match = line.match(/^\s+(\S+):(\d+) - (.+)$/);
    if (!match) continue;
    entries.push({
      raw: line.replace(/^\s+/, ''),
      file: match[1],
      line: Number(match[2]),
      reason: match[3],
    });
  }
  return entries;
}

function formatFilteredReport({ owner, inputPath: source, assetFailures }) {
  const files = new Set(assetFailures.map((entry) => entry.file));
  const lines = [
    'React Compiler Report (Assets CODEOWNERS)',
    '========================================',
    `Source:              ${source}`,
    `Team:                ${owner}`,
    `Files with failures: ${files.size}`,
    `Failure lines:       ${assetFailures.length}`,
    '',
    'Failures:',
    '----------------------------------------',
    ...assetFailures.map((entry) => `  ${entry.raw}`),
    '',
  ];
  return lines.join('\n');
}

function formatSummaryReport({ owner, assetFailures }) {
  const byFile = new Map();
  const byReason = new Map();
  for (const entry of assetFailures) {
    if (!byFile.has(entry.file)) byFile.set(entry.file, []);
    byFile.get(entry.file).push(entry);
    const reason = simplifyReason(entry.reason);
    if (!byReason.has(reason)) byReason.set(reason, []);
    byReason.get(reason).push(entry);
  }

  const sortedFiles = [...byFile.entries()].sort((a, b) => b[1].length - a[1].length);
  const sortedReasons = [...byReason.entries()].sort((a, b) => b[1].length - a[1].length);

  const lines = [
    'Assets React Compiler Failures',
    '========================================',
    `Team:             ${owner}`,
    `Unique files:     ${byFile.size}`,
    `Failure lines:    ${assetFailures.length}`,
    `Unique reasons:   ${byReason.size}`,
    '',
    'By reason',
    '----------------------------------------',
    ...sortedReasons.flatMap(([reason, entries]) => {
      const files = [...new Set(entries.map((entry) => entry.file))];
      return [`  ${entries.length}×  ${reason}`, ...files.map((file) => `      ${file}`), ''];
    }),
    'By file',
    '----------------------------------------',
    ...sortedFiles.flatMap(([file, entries]) => [
      `  ${file} (${entries.length})`,
      ...entries.map((entry) => `      L${entry.line}: ${entry.reason}`),
      '',
    ]),
  ];
  return lines.join('\n');
}

function simplifyReason(reason) {
  return reason.replace(/^\(anonymous\):\s*/, '');
}
