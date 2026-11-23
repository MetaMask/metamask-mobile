/* eslint-disable import-x/no-nodejs-modules */
/**
 * Keeps the E2E API mocks aligned with the live APIs.
 *
 * Reads the `## Sync config` table of `tests/api-mocking/api-mock-catalog.md`.
 * For each row it calls the live API (`Sync URL`) and compares the SHAPE of the
 * response with the mock:
 *
 * - `write`: adds fields the API now returns, removes fields it no longer returns, and keeps every existing value (tests assert on those).
 * - `report-only`: prints the same drift and never writes.
 * - `skip`: ignored.
 *
 * A `write` mock must be a dedicated module of the form
 * `export const NAME = <value> satisfies <Type>;`, which the script rewrites.
 *
 * Usage: `yarn test:e2e:sync-api-mocks [options]`. Without options it writes the
 * `write` mocks and reports the rest.
 *
 * Options:
 * - `--dry-run` reports drift and writes nothing.
 * - `--only <id>` limits the run to one row (repeatable).
 * - `--report <file>` also writes the drift report as markdown.
 *
 * Exit codes:
 * - 0: no drift.
 * - 1: drift in `write` rows (written, or would be written with `--dry-run`).
 * - 2: drift only in `report-only` rows.
 * - 3: a row failed (fetch error, bad config, refused write). Wins over 1 and 2.
 */
import fs from 'fs';
import path from 'path';

export type Json =
  | null
  | boolean
  | number
  | string
  | Json[]
  | { [key: string]: Json };

interface JsonObject {
  [key: string]: Json;
}

export type ChangeKind = 'added' | 'removed' | 'retyped';

export interface Change {
  path: string;
  kind: ChangeKind;
}

export interface MergeResult {
  value: Json;
  changes: Change[];
}

export type SyncMode = 'write' | 'report-only' | 'skip';

export interface SyncRow {
  id: string;
  mode: SyncMode;
  syncUrl: string;
  file: string;
  exportName: string;
  /** Sample URL used to pick one entry out of a `MockEventsObject` export. */
  matchUrl?: string;
  /** Paths whose object keys are data (ids, currencies), not fields. */
  mapPaths: ReadonlySet<string>;
}

export type RowStatus = 'ok' | 'drift' | 'error' | 'refused';

export interface RowResult {
  id: string;
  mode: SyncMode;
  file: string;
  status: RowStatus;
  changes: Change[];
  written: boolean;
  error?: string;
}

export interface SyncDeps {
  fetchJson: (url: string) => Promise<Json>;
  loadMock: (row: SyncRow) => Promise<Json>;
  writeMock: (row: SyncRow, value: Json) => Promise<void>;
}

export const CATALOG_PATH = 'tests/api-mocking/api-mock-catalog.md';
const SYNC_CONFIG_HEADING = '## Sync config';
const MAX_CHANGES_LISTED = 15;

const isObject = (value: Json | undefined): value is JsonObject =>
  value !== null &&
  value !== undefined &&
  typeof value === 'object' &&
  !Array.isArray(value);

const clone = <TValue extends Json>(value: TValue): TValue =>
  JSON.parse(JSON.stringify(value)) as TValue;

function kindOf(value: Json): string {
  if (value === null) {
    return 'null';
  }
  return Array.isArray(value) ? 'array' : typeof value;
}

const childPath = (parent: string, key: string): string =>
  parent === '/' ? `/${key}` : `${parent}/${key}`;

function mergeInto(
  mock: Json,
  lives: Json[],
  at: string,
  mapPaths: ReadonlySet<string>,
  changes: Change[],
  requireAll: boolean,
): Json {
  const candidates = lives.filter((live) => live !== null);
  if (candidates.length === 0) {
    // A live null carries no shape, so the mock value stays.
    return mock;
  }

  const sameKind = candidates.filter(
    (live) => kindOf(live) === kindOf(mock),
  );
  if (mock === null || sameKind.length === 0) {
    changes.push({ path: at, kind: 'retyped' });
    return clone(candidates[0]);
  }

  if (isObject(mock)) {
    const liveObjects = sameKind as JsonObject[];
    const result: JsonObject = {};
    if (mapPaths.has(at)) {
      const everyValue = liveObjects.flatMap((live) => Object.values(live));
      for (const key of Object.keys(mock)) {
        const sameKey = liveObjects
          .map((live) => live[key])
          .filter((value) => value !== undefined);
        result[key] = mergeInto(
          mock[key],
          sameKey.length > 0 ? sameKey : everyValue,
          childPath(at, key),
          mapPaths,
          changes,
          requireAll || sameKey.length === 0,
        );
      }
      return result;
    }
    const liveKeys = new Set(liveObjects.flatMap((live) => Object.keys(live)));
    for (const key of Object.keys(mock)) {
      if (!liveKeys.has(key)) {
        changes.push({ path: childPath(at, key), kind: 'removed' });
        continue;
      }
      result[key] = mergeInto(
        mock[key],
        liveObjects
          .map((live) => live[key])
          .filter((value) => value !== undefined),
        childPath(at, key),
        mapPaths,
        changes,
        requireAll,
      );
    }
    for (const key of liveKeys) {
      if (key in mock) {
        continue;
      }
      // Among many items, a field only some of them return is optional.
      if (
        requireAll &&
        !liveObjects.every(
          (live) => live[key] !== undefined && live[key] !== null,
        )
      ) {
        continue;
      }
      const value = liveObjects
        .map((live) => live[key])
        .find((candidate) => candidate !== null && candidate !== undefined);
      if (value !== undefined) {
        changes.push({ path: childPath(at, key), kind: 'added' });
        result[key] = clone(value);
      }
    }
    return result;
  }

  if (Array.isArray(mock)) {
    const items = (sameKind as Json[][]).flat();
    if (mock.length === 0 || items.length === 0) {
      return mock;
    }
    const liveObjects = items.filter(isObject);
    if (mock.every(isObject) && liveObjects.length > 0) {
      return mock.map((item) =>
        mergeInto(item, liveObjects, `${at}[]`, mapPaths, changes, true),
      );
    }
    const mockKinds = new Set(mock.map(kindOf));
    const liveKinds = new Set(items.map(kindOf));
    if ([...mockKinds].some((kind) => liveKinds.has(kind))) {
      // Lists of primitives, or lists of lists, are data: keep them.
      return mock;
    }
    changes.push({ path: `${at}[]`, kind: 'retyped' });
    return clone(sameKind[0]);
  }

  return mock;
}

/**
 * Aligns the shape of `mock` with `live` and keeps the values of `mock`.
 *
 * Fields only `live` has are added with the live value. Fields only `mock`
 * has are removed. A field whose type changed takes the live value. A live
 * `null` keeps the mock value. Lists of objects are merged field by field
 * against every live item: a field is removed once no live item returns it,
 * and added only when every live item returns it, so an optional field is not
 * copied onto items that never had it. Objects at `mapPaths` are data maps
 * whose keys are never added or removed.
 *
 * @param mock - The current mock response.
 * @param live - The live API response.
 * @param mapPaths - Paths of data maps; `/` is the root.
 * @returns The merged value and the list of changes.
 */
export function mergeShape(
  mock: Json,
  live: Json,
  mapPaths: ReadonlySet<string> = new Set(),
): MergeResult {
  const changes: Change[] = [];
  const value = mergeInto(mock, [live], '/', mapPaths, changes, false);
  const seen = new Set<string>();
  return {
    value,
    changes: changes.filter((change) => {
      const key = `${change.kind} ${change.path}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    }),
  };
}

/**
 * Detects a live response that is not a real answer, such as an error body
 * returned with status 200: more than half of the mock's top-level fields
 * would disappear.
 *
 * @param mock - The current mock response.
 * @param result - The merge of the mock with the live response.
 * @param mapPaths - Paths of data maps.
 * @returns True when the write should be refused.
 */
export function isSuspiciousRewrite(
  mock: Json,
  result: MergeResult,
  mapPaths: ReadonlySet<string>,
): boolean {
  if (!isObject(mock) || mapPaths.has('/')) {
    return false;
  }
  const keys = Object.keys(mock).length;
  if (keys < 2) {
    return false;
  }
  const removed = result.changes.filter(
    (change) =>
      change.kind === 'removed' &&
      change.path.split('/').length === 2 &&
      !change.path.includes('['),
  ).length;
  return removed * 2 > keys;
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\||\|$/gu, '')
    .split('|')
    .map((cell) => cell.trim().replace(/^`|`$/gu, ''));
}

/**
 * Parses the `## Sync config` table of the catalog. Columns: `ID`, `Mode`,
 * `Sync URL`, `Mock` (`file#Export`, or `file#Export@<sample url>` to select
 * one entry of a mock list), `Options` (`map=<path>[,<path>]`).
 *
 * @param markdown - Contents of the catalog.
 * @returns The rows that are not `skip`.
 */
export function parseCatalog(markdown: string): SyncRow[] {
  const lines = markdown.split('\n');
  const start = lines.findIndex((line) => line.trim() === SYNC_CONFIG_HEADING);
  if (start === -1) {
    throw new Error(`Catalog has no "${SYNC_CONFIG_HEADING}" section.`);
  }
  const tableLines: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('## ')) {
      break;
    }
    if (line.trim().startsWith('|')) {
      tableLines.push(line);
    }
  }
  const [header, , ...body] = tableLines;
  if (!header) {
    throw new Error('Sync config table is empty.');
  }
  const columns = splitRow(header).map((name) => name.toLowerCase());
  const expected = ['id', 'mode', 'sync url', 'mock', 'options'];
  if (expected.some((name, index) => columns[index] !== name)) {
    throw new Error(`Sync config columns must be: ${expected.join(', ')}.`);
  }

  const rows: SyncRow[] = [];
  const seen = new Set<string>();
  for (const line of body) {
    const [id, mode, syncUrl, mock, options = ''] = splitRow(line);
    if (seen.has(id)) {
      throw new Error(`Duplicate sync config id "${id}".`);
    }
    seen.add(id);
    if (!['write', 'report-only', 'skip'].includes(mode)) {
      throw new Error(`Sync config "${id}" has unknown mode "${mode}".`);
    }
    if (mode === 'skip') {
      continue;
    }
    if (!syncUrl || !/^https:\/\//u.test(syncUrl)) {
      throw new Error(`Sync config "${id}" needs an https Sync URL.`);
    }
    const [file, rest = ''] = mock.split('#');
    const [exportName, matchUrl] = rest.split('@');
    if (!file || !exportName) {
      throw new Error(`Sync config "${id}" needs a Mock of "file#Export".`);
    }
    if (mode === 'write' && matchUrl) {
      throw new Error(
        `Sync config "${id}": a write mock must be its own export, not a list entry.`,
      );
    }
    const mapPaths = new Set<string>();
    for (const option of options.split(/\s+/u).filter(Boolean)) {
      const [name, value] = option.split('=');
      if (name !== 'map' || !value) {
        throw new Error(`Sync config "${id}" has unknown option "${option}".`);
      }
      value.split(',').forEach((mapPath) => mapPaths.add(mapPath));
    }
    rows.push({
      id,
      mode: mode as SyncMode,
      syncUrl,
      file,
      exportName,
      matchUrl,
      mapPaths,
    });
  }
  return rows;
}

/**
 * Replaces the value of `export const NAME = <value> satisfies <Type>;`.
 *
 * @param source - The mock module.
 * @param exportName - The exported constant to rewrite.
 * @param value - The new value.
 * @returns The new module text, not yet formatted.
 */
export function rewriteExport(
  source: string,
  exportName: string,
  value: Json,
): string {
  const marker = `export const ${exportName} = `;
  const start = source.indexOf(marker);
  if (start === -1) {
    throw new Error(`"${marker.trim()}" not found.`);
  }
  const satisfiesAt = source.lastIndexOf(' satisfies ');
  if (satisfiesAt < start) {
    throw new Error(
      `"${exportName}" must end with "satisfies <Type>;" so the sync keeps it typed.`,
    );
  }
  return `${source.slice(0, start + marker.length)}${JSON.stringify(
    value,
  )}${source.slice(satisfiesAt)}`;
}

interface MockEntryLike {
  urlEndpoint: string | RegExp;
  response: unknown;
}

/**
 * Picks the response of the mock registered for `url` out of a
 * `MockEventsObject`-shaped export.
 *
 * @param container - Export holding lists of mock entries per HTTP method.
 * @param url - Sample URL the entry must match.
 * @returns The entry's response.
 */
export function findMockResponse(container: unknown, url: string): Json {
  if (!container || typeof container !== 'object') {
    throw new Error('The mock export is not an object.');
  }
  for (const entries of Object.values(container)) {
    if (!Array.isArray(entries)) {
      continue;
    }
    for (const entry of entries as MockEntryLike[]) {
      const matches =
        typeof entry.urlEndpoint === 'string'
          ? entry.urlEndpoint === url
          : entry.urlEndpoint.test(url);
      if (matches) {
        return entry.response as Json;
      }
    }
  }
  throw new Error(`No mock matches ${url}.`);
}

/**
 * Syncs one catalog row.
 *
 * @param row - The catalog row.
 * @param deps - Network, module loading and file writing.
 * @param options - Options.
 * @param options.dryRun - Report drift without writing.
 * @returns The outcome of the row.
 */
export async function syncRow(
  row: SyncRow,
  deps: SyncDeps,
  { dryRun }: { dryRun: boolean },
): Promise<RowResult> {
  const base = {
    id: row.id,
    mode: row.mode,
    file: row.file,
    changes: [],
    written: false,
  };
  try {
    const [mock, live] = await Promise.all([
      deps.loadMock(row),
      deps.fetchJson(row.syncUrl),
    ]);
    const result = mergeShape(mock, live, row.mapPaths);
    if (result.changes.length === 0) {
      return { ...base, status: 'ok' };
    }
    if (row.mode === 'write' && isSuspiciousRewrite(mock, result, row.mapPaths)) {
      return {
        ...base,
        changes: result.changes,
        status: 'refused',
        error:
          'The live response would drop most top-level fields; it looks like an error body.',
      };
    }
    let written = false;
    if (row.mode === 'write' && !dryRun) {
      await deps.writeMock(row, result.value);
      written = true;
    }
    return { ...base, changes: result.changes, status: 'drift', written };
  } catch (error) {
    return {
      ...base,
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * @param results - Row outcomes.
 * @returns The process exit code, documented at the top of this file.
 */
export function exitCodeFor(results: RowResult[]): number {
  if (results.some((r) => r.status === 'error' || r.status === 'refused')) {
    return 3;
  }
  if (results.some((r) => r.status === 'drift' && r.mode === 'write')) {
    return 1;
  }
  return results.some((r) => r.status === 'drift') ? 2 : 0;
}

const KIND_LABEL: Record<ChangeKind, string> = {
  added: 'added',
  removed: 'removed',
  retyped: 'type changed',
};

function describeChanges(changes: Change[]): string[] {
  const lines = changes
    .slice(0, MAX_CHANGES_LISTED)
    .map((change) => `${KIND_LABEL[change.kind]} \`${change.path}\``);
  if (changes.length > MAX_CHANGES_LISTED) {
    lines.push(`${changes.length - MAX_CHANGES_LISTED} more`);
  }
  return lines;
}

/**
 * @param results - Row outcomes.
 * @param dryRun - Whether write rows were left unchanged.
 * @returns Markdown for the job summary and the sync pull request body.
 */
export function formatReport(results: RowResult[], dryRun: boolean): string {
  const section = (
    title: string,
    rows: RowResult[],
    render: (row: RowResult) => string[],
  ): string[] =>
    rows.length === 0
      ? []
      : [`### ${title}`, '', ...rows.flatMap(render), ''];

  const writeDrift = results.filter(
    (r) => r.status === 'drift' && r.mode === 'write',
  );
  const reportDrift = results.filter(
    (r) => r.status === 'drift' && r.mode === 'report-only',
  );
  const failed = results.filter(
    (r) => r.status === 'error' || r.status === 'refused',
  );
  const bullet = (row: RowResult): string[] => [
    `- \`${row.id}\` (\`${row.file}\`)`,
    ...describeChanges(row.changes).map((line) => `  - ${line}`),
  ];

  const lines = [
    ...section(
      dryRun ? 'Mocks that would be updated' : 'Mocks updated',
      writeDrift,
      bullet,
    ),
    ...section(
      'Drift in report-only mocks (not written, review by hand)',
      reportDrift,
      bullet,
    ),
    ...section('Rows that failed', failed, (row) => [
      `- \`${row.id}\`: ${row.error ?? row.status}`,
    ]),
  ];
  if (lines.length === 0) {
    return 'No API changes detected\n';
  }
  return `${lines.join('\n')}\n`;
}

async function fetchJsonWithRetry(url: string): Promise<Json> {
  const attempts = 3;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { 'X-Client-Id': 'mobile', Accept: 'application/json' },
        signal: AbortSignal.timeout(60_000),
      });
      if (response.status === 429 || response.status >= 500) {
        throw new Error(`HTTP ${response.status}`);
      }
      if (!response.ok) {
        // A 4xx will not change on retry.
        throw Object.assign(new Error(`HTTP ${response.status}`), {
          permanent: true,
        });
      }
      return (await response.json()) as Json;
    } catch (error) {
      lastError = error;
      if ((error as { permanent?: boolean }).permanent || attempt === attempts) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
    }
  }
  const reason =
    lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`${url} failed: ${reason}`);
}

async function createDeps(): Promise<SyncDeps> {
  const prettier = await import('prettier');
  return {
    fetchJson: fetchJsonWithRetry,
    loadMock: async (row) => {
      const mod = (await import(path.resolve(row.file))) as Record<
        string,
        unknown
      >;
      const exported = mod[row.exportName];
      if (exported === undefined) {
        throw new Error(`${row.file} does not export ${row.exportName}.`);
      }
      return clone(
        (row.matchUrl
          ? findMockResponse(exported, row.matchUrl)
          : exported) as Json,
      );
    },
    writeMock: async (row, value) => {
      const file = path.resolve(row.file);
      const config = (await prettier.resolveConfig(file)) ?? {};
      const next = await prettier.format(
        rewriteExport(fs.readFileSync(file, 'utf8'), row.exportName, value),
        { ...config, filepath: file },
      );
      fs.writeFileSync(file, next);
    },
  };
}

function parseArgs(argv: string[]): {
  dryRun: boolean;
  only: string[];
  report?: string;
} {
  const only: string[] = [];
  let report: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--only') {
      only.push(argv[++i]);
    } else if (argv[i] === '--report') {
      report = argv[++i];
    }
  }
  return { dryRun: argv.includes('--dry-run'), only, report };
}

async function main(): Promise<void> {
  const { dryRun, only, report } = parseArgs(process.argv.slice(2));
  let rows = parseCatalog(fs.readFileSync(CATALOG_PATH, 'utf8'));
  if (only.length > 0) {
    const unknown = only.filter((id) => !rows.some((row) => row.id === id));
    if (unknown.length > 0) {
      throw new Error(`Unknown sync config id: ${unknown.join(', ')}`);
    }
    rows = rows.filter((row) => only.includes(row.id));
  }

  const deps = await createDeps();
  const results: RowResult[] = [];
  const concurrency = 4;
  const queue = [...rows];
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      for (let row = queue.shift(); row; row = queue.shift()) {
        results.push(await syncRow(row, deps, { dryRun }));
      }
    }),
  );
  results.sort((a, b) => a.id.localeCompare(b.id));

  const markdown = formatReport(results, dryRun);
  process.stdout.write(markdown);
  if (report) {
    fs.writeFileSync(report, markdown);
  }
  process.exitCode = exitCodeFor(results);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 3;
  });
}
