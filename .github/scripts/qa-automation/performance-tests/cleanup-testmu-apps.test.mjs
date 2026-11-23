import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const scriptPath = path.join(
  process.cwd(),
  '.github',
  'scripts',
  'qa-automation',
  'performance-tests',
  'cleanup-testmu-apps.sh',
);

// 2026-10-29T12:00:00Z; the default 3 day cutoff is 2026-10-26T12:00:00Z.
const NOW = '1793275200';

const app = (id, customId, updatedAt) => ({
  app_id: id,
  name: customId,
  custom_id: customId,
  updated_at: updatedAt,
});

const PAGE_ONE = [
  app('APP_NEW', 'metamask-android-with-srp-new', '2026-10-29T06:42:16.000Z'),
  app(
    'APP_OLD_WITH',
    'metamask-android-with-srp-old',
    '2026-10-26T09:14:33.000Z',
  ),
];
const PAGE_TWO = [
  app(
    'APP_OLD_WITHOUT',
    'metamask-android-without-srp-old',
    '2026-10-21T12:20:53.000Z',
  ),
  app('APP_OTHER', 'someone-elses-app-123', '2026-10-01T00:00:00.000Z'),
  { app_id: 'APP_NO_DATE', custom_id: 'metamask-android-with-srp-nodate' },
  app('APP_BAD_DATE', 'metamask-android-with-srp-baddate', 'not-a-date'),
];

function runCleanup({ pages, args = [], env = {}, totalOverride }) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testmu-cleanup-'));
  const logFile = path.join(tempDir, 'curl.log');
  const total =
    totalOverride ?? pages.reduce((sum, page) => sum + page.length, 0);

  pages.forEach((data, index) => {
    fs.writeFileSync(
      path.join(tempDir, `page-${index}.json`),
      JSON.stringify({ data, metaData: { total, limit: 2, offset: 0 } }),
    );
  });

  const fakeCurl = `#!/usr/bin/env bash
method=GET
body=""
url=""
while [ "$#" -gt 0 ]; do
  case "$1" in
    -X) method="$2"; shift 2 ;;
    --data) body="$2"; shift 2 ;;
    -u|-H) shift 2 ;;
    -*) shift ;;
    *) url="$1"; shift ;;
  esac
done
printf '%s %s %s\\n' "$method" "$url" "$body" >> "$FAKE_CURL_LOG"
if [ "$method" = "DELETE" ]; then
  echo '{"status":"success"}'
  exit 0
fi
offset="$(sed -n 's/.*offset=\\([0-9]*\\).*/\\1/p' <<<"$url")"
page_file="$FAKE_CURL_DIR/page-$((offset / 2)).json"
if [ -n "\${FAKE_IGNORE_OFFSET:-}" ]; then page_file="$FAKE_CURL_DIR/page-0.json"; fi
if [ -f "$page_file" ]; then cat "$page_file"; else echo '{"data":[],"metaData":{"total":0}}'; fi
`;
  fs.writeFileSync(path.join(tempDir, 'curl'), fakeCurl, { mode: 0o755 });

  const result = spawnSync('bash', [scriptPath, ...args], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      LT_USERNAME: 'user',
      LT_ACCESS_KEY: 'key',
      TESTMU_CLEANUP_NOW: NOW,
      TESTMU_CLEANUP_PAGE_LIMIT: '2',
      FAKE_CURL_LOG: logFile,
      FAKE_CURL_DIR: tempDir,
      PATH: `${tempDir}:${process.env.PATH}`,
      ...env,
    },
    encoding: 'utf8',
  });

  const log = fs.existsSync(logFile)
    ? fs.readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean)
    : [];
  return { ...result, log };
}

const deleteCalls = (log) => log.filter((line) => line.startsWith('DELETE '));

test('deletes only old MetaMask apps across all pages in one batch', () => {
  const result = runCleanup({ pages: [PAGE_ONE, PAGE_TWO.slice(0, 2)] });

  assert.equal(result.status, 0, result.stderr);
  const deletes = deleteCalls(result.log);
  assert.equal(deletes.length, 1);
  assert.match(deletes[0], /\/app\/delete /);
  assert.match(deletes[0], /"appIds":"APP_OLD_WITH,APP_OLD_WITHOUT"/);
  assert.doesNotMatch(deletes[0], /APP_NEW|APP_OTHER/);
});

test('never deletes apps with a foreign id, a missing date or an unparseable date', () => {
  const result = runCleanup({ pages: [PAGE_ONE, PAGE_TWO.slice(0, 2), PAGE_TWO.slice(2)] });

  assert.equal(result.status, 0, result.stderr);
  const body = deleteCalls(result.log).join('\n');
  assert.doesNotMatch(body, /APP_OTHER|APP_NO_DATE|APP_BAD_DATE|APP_NEW/);
  assert.match(body, /APP_OLD_WITH,APP_OLD_WITHOUT/);
});

test('matches apps by name or customId when custom_id is missing', () => {
  const result = runCleanup({
    pages: [
      [
        {
          app_id: 'APP_BY_NAME',
          name: 'metamask-android-with-srp-byname',
          updated_at: '2026-10-20T00:00:00.000Z',
        },
        {
          app_id: 'APP_BY_CAMEL',
          customId: 'metamask-android-without-srp-bycamel',
          updated_at: '2026-10-20T00:00:00.000Z',
        },
      ],
    ],
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(
    deleteCalls(result.log).join('\n'),
    /"appIds":"APP_BY_NAME,APP_BY_CAMEL"/,
  );
});

test('--dry-run lists candidates without issuing a DELETE request', () => {
  const result = runCleanup({
    pages: [PAGE_ONE, PAGE_TWO.slice(0, 2)],
    args: ['--dry-run'],
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(deleteCalls(result.log).length, 0);
  assert.match(result.stdout, /APP_OLD_WITH/);
  assert.match(result.stdout, /APP_OLD_WITHOUT/);
});

test('splits deletions into batches of the configured size', () => {
  const result = runCleanup({
    pages: [PAGE_ONE, PAGE_TWO.slice(0, 2)],
    env: { TESTMU_CLEANUP_BATCH_SIZE: '1' },
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(deleteCalls(result.log).length, 2);
});

test('honours TESTMU_APP_RETENTION_DAYS', () => {
  const result = runCleanup({
    pages: [PAGE_ONE, PAGE_TWO.slice(0, 2)],
    env: { TESTMU_APP_RETENTION_DAYS: '10' },
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(deleteCalls(result.log).length, 0);
});

test('stops paginating when the API ignores offset and repeats a page', () => {
  const result = runCleanup({
    pages: [PAGE_ONE],
    totalOverride: 100,
    env: { TESTMU_CLEANUP_MAX_PAGES: '5', FAKE_IGNORE_OFFSET: '1' },
  });
  const listCalls = result.log.filter((line) => line.startsWith('GET '));

  assert.equal(result.status, 0, result.stderr);
  assert.ok(listCalls.length <= 2, `unexpected list calls: ${listCalls.length}`);
});

test('fails fast without credentials', () => {
  const result = runCleanup({
    pages: [PAGE_ONE],
    env: { LT_USERNAME: '', LT_ACCESS_KEY: '' },
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /LT_USERNAME is required/);
});
