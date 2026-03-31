#!/usr/bin/env node
/**
 *
 * Collects QA metrics into a qa-stats.json file, key: value format.
 * Metrics that could not be collected (missing artifacts, tests did not run)
 * are omitted from the output, i.e., they will not appear in the output file.
 *
 * Required env vars:
 *   GITHUB_TOKEN      — GitHub Actions token for API access
 *   GITHUB_REPOSITORY — Repository in "owner/repo" format (set automatically in Actions)
 * 
 * How to add a new metric:
 *   1. Add a collector function that returns a plain object
 *   2. Register it in the collectors array in main()
 * 
 * The only rule: never rename existing keys. The DB key used for storing the metrics is (project, run_id, namespace, metric_key). 
 * Renaming a key in the JSON creates a new series in the DB while the old name stops getting new data, 
 * which breaks the Grafana time series continuity. Adding and removing keys is fine.
 *
 * Artifact names used below are coupled to `name:` fields in ci.yml and run-e2e-workflow.yml —
 * renaming either side silently drops that metric from the output.
 *
 * MetaMetrics (top-level `metametrics` namespace): static scan of
 * `tests/helpers/analytics/expectations/*.ts` plus `LEGACY_INLINE_METAMETRICS_PATHS`
 * for specs not yet using declarative expectations.
 *
 * Example output:
 *   {
 *     "unit":          { "total_tests_run": 41957, "total_tests_skipped": 17, "bridge_tests_run": 5000, "other_tests_run": 1000 },
 *     "component_view":{ "total_tests_run": 94,    "total_tests_skipped": 0 },
 *     "e2e":           { "total_tests_run": 420,   "total_tests_skipped": 27,
 *                        "main_tests_run": 276, "main_android_tests_run": 276, "main_ios_tests_run": 276,
 *                        "flask_tests_run": 144, "confirmations_tests_run": 62 },
 *     "metametrics":   { "metametrics_events_checked_unique_count": 42,
 *                        "metametrics_events_checked_names_json": "[\"Action Button Clicked\", ...]" },
 *     "performance":   { "total_tests_defined": 21, "total_tests_skipped": 1,
 *                        "login_tests_defined": 11, "onboarding_tests_defined": 4, "mm_connect_tests_defined": 6 }
 *   }
 */

import { readFile, writeFile, mkdir, readdir, access } from 'fs/promises';
import { constants as fsConstants } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY ?? 'MetaMask/metamask-mobile';

if (!GITHUB_TOKEN) throw new Error('Missing required GITHUB_TOKEN env var');


// ---------------------------------------------------------------------------
// Static-scan targets
// Update these (easy with AI) if the repository directory structure or file-naming conventions
// change — the collectors below rely on them for skip/defined counts.
// ---------------------------------------------------------------------------
const SCAN_APP_DIR        = 'app';
const SCAN_E2E_SMOKE_DIRS = ['tests/smoke'];
/** Declarative MetaMetrics expectations (`AnalyticsExpectations`) — primary source for QA event coverage. */
const SCAN_ANALYTICS_EXPECTATIONS_DIR = 'tests/helpers/analytics/expectations';
/**
 * E2E sources that still assert MetaMetrics inline (not only via expectations/*.analytics.ts).
 * Remove paths here when migrated to the expectations folder so the slim parser is enough.
 */
const LEGACY_INLINE_METAMETRICS_PATHS = [
  'tests/smoke/card/card-button.spec.ts',
  'tests/smoke/card/card-home-add-funds.spec.ts',
  'tests/smoke/card/card-home-manage-card.spec.ts',
  'tests/smoke/confirmations/send/metricsValidationHelper.ts',
  'tests/smoke/confirmations/transactions/dapp-initiated-transfer.spec.ts',
  'tests/smoke/predict/predict-cash-out.spec.ts',
  'tests/smoke/predict/predict-claim-positions.spec.ts',
  'tests/smoke/predict/predict-geo-restriction.spec.ts',
  'tests/smoke/predict/predict-open-position.spec.ts',
  'tests/smoke/ramps/onramp-unified-buy.spec.ts',
  'tests/smoke/snaps/test-snap-preinstalled.spec.ts',
  'tests/smoke/swap/bridge-action-smoke.spec.ts',
  'tests/smoke/swap/swap-action-smoke.spec.ts',
  'tests/smoke/wallet/analytics/import-wallet.spec.ts',
  'tests/smoke/wallet/analytics/new-wallet.spec.ts',
  'tests/regression/ramps/onramp-parameters.spec.ts',
  'tests/regression/wallet/analytics/opt-out.ts',
];
const PATH_ONBOARDING_EVENTS = 'tests/helpers/analytics/helpers.ts';
const SCAN_PERFORMANCE_DIR = 'tests/performance';

const PATTERN_CV_TEST_FILE   = /\.view(?:\..+)?\.test\.[jt]sx?$/;
const PATTERN_UNIT_TEST_FILE = /\.test\.[jt]sx?$/;
const PATTERN_E2E_SPEC_FILE  = /\.spec\.[jt]sx?$/;
const PATTERN_PERF_SPEC_FILE = /\.spec\.js$/;


// ---------------------------------------------------------------------------
// GitHub artifact helpers
// ---------------------------------------------------------------------------

let _runId = null;
let _artifactList = null;

/**
 * Fetches the ID of the latest successful CI workflow run on `main`.
 *
 * @returns {Promise<string>}
 */
async function getLatestCiRunId() {
  const url = `https://api.github.com/repos/${GITHUB_REPOSITORY}/actions/workflows/ci.yml/runs?branch=main&status=success&per_page=1`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch CI workflow runs: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const run = data.workflow_runs?.[0];
  if (!run) {
    throw new Error('No successful CI workflow runs found on main');
  }

  console.log(`[run] Using latest successful ci run #${run.run_number} (id=${run.id}, ${run.created_at})`);
  return String(run.id);
}

async function getRunId() {
  if (_runId) return _runId;
  _runId = await getLatestCiRunId();
  return _runId;
}

/**
 * Fetches (and caches) the list of artifact names for the triggering CI run.
 * First call fetches and stores, every subsequent call returns the cached value.
 * 
 * @returns {Promise<Array>}
 */
async function getArtifactList() {
  if (_artifactList) return _artifactList;

  const runId = await getRunId();
  const artifacts = [];
  let page = 1;

  while (true) {
    const url = `https://api.github.com/repos/${GITHUB_REPOSITORY}/actions/runs/${runId}/artifacts?per_page=100&page=${page}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to list artifacts (page ${page}): ${res.status} ${res.statusText}`);
    }

    const data = await res.json();
    artifacts.push(...data.artifacts);

    if (data.artifacts.length < 100) break;
    page++;
  }

  _artifactList = artifacts;
  return _artifactList;
}

/**
 * Downloads a named artifact from the triggering CI run, extracts it into a
 * local directory named after the artifact, and returns that directory path.
 *
 * @param {string} artifactName
 * @returns {Promise<string>} Path to the directory containing the extracted files
 */
async function downloadArtifact(artifactName) {
  const artifacts = await getArtifactList();
  const artifact = artifacts.find((a) => a.name === artifactName);
  const runId = await getRunId();

  if (!artifact) {
    throw new Error(
      `Artifact "${artifactName}" not found in run ${runId}`,
    );
  }

  // GitHub redirects to a pre-signed S3 URL. Follow manually so the
  // Authorization header is not forwarded to S3.
  const redirectRes = await fetch(artifact.archive_download_url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
    redirect: 'manual',
  });

  const downloadUrl = redirectRes.headers.get('location');
  if (!downloadUrl) {
    throw new Error(`No redirect URL returned for artifact "${artifactName}"`);
  }

  const zipRes = await fetch(downloadUrl);
  if (!zipRes.ok) {
    throw new Error(
      `Failed to download artifact "${artifactName}": ${zipRes.status} ${zipRes.statusText}`,
    );
  }

  const destDir = `./${artifactName}`;
  await mkdir(destDir, { recursive: true });
  const zipPath = join(destDir, `${artifactName}.zip`);
  await writeFile(zipPath, Buffer.from(await zipRes.arrayBuffer()));
  execSync(`unzip -q "${zipPath}" -d "${destDir}"`);

  return destDir;
}

// ---------------------------------------------------------------------------
// Collectors — one async function per metric source
// ---------------------------------------------------------------------------

/**
 * Counts the number of individual test cases that are skipped in a source string.
 *
 * Two categories:
 *   1. Explicit: `it.skip()` / `test.skip()` outside any `describe.skip` block — 1 skipped test each.
 *   2. Implicit: every `it()` / `test()` call (including `.skip` variants) inside a `describe.skip`
 *      block, because the whole block is skipped by the runner.
 *
 * `describe.skip` blocks are extracted via brace matching so their contents are
 * not double-counted against the explicit-skip pass.
 *
 * @param {string} source
 * @returns {number}
 */
function countSkips(source) {
  // Find all describe.skip blocks using brace matching.
  const describeBlocks = [];
  const re = /\bdescribe\.skip\s*\(/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    const braceStart = source.indexOf('{', m.index + m[0].length);
    if (braceStart === -1) continue;
    let depth = 1, pos = braceStart + 1;
    while (pos < source.length && depth > 0) {
      if (source[pos] === '{') depth++;
      else if (source[pos] === '}') depth--;
      pos++;
    }
    describeBlocks.push({ start: m.index, end: pos, content: source.slice(braceStart + 1, pos - 1) });
  }

  // Strip describe.skip regions from source (reverse order to preserve indices).
  let outside = source;
  for (let i = describeBlocks.length - 1; i >= 0; i--) {
    outside = outside.slice(0, describeBlocks[i].start) + outside.slice(describeBlocks[i].end);
  }

  // Part 1: it.skip / test.skip outside describe.skip blocks.
  const explicitSkips = (outside.match(/\b(?:it|test)\.skip\s*\(/g) ?? []).length;

  // Part 2: all it() / test() (including .skip) inside describe.skip blocks.
  const implicitSkips = describeBlocks.reduce(
    (sum, { content }) => sum + (content.match(/\b(?:it|test)(?:\.skip)?\s*\(/g) ?? []).length,
    0,
  );

  return explicitSkips + implicitSkips;
}

/**
 * Counts all individual test definitions in a source string — both active and
 * skipped. Matches it(, it.skip(, test(, test.skip(.
 * Excludes describe() which is a grouper, not an individual test.
 *
 * @param {string} source
 * @returns {number}
 */
function countDefinedTests(source) {
  return (source.match(/\b(?:it|test)(?:\.skip)?\s*\(/g) ?? []).length;
}

/**
 * Recursively collects file paths under `dir` that satisfy `predicate(filename)`.
 *
 * @param {string} dir
 * @param {(name: string) => boolean} predicate
 * @returns {Promise<string[]>}
 */
async function walkFiles(dir, predicate) {
  const results = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await walkFiles(fullPath, predicate)));
    } else if (entry.isFile() && predicate(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// E2E MetaMetrics event names (static scan)
// Primary: tests/helpers/analytics/expectations/*.ts (AnalyticsExpectations).
// Legacy: explicit paths that still use getEventsPayloads / inline comparisons.
// ---------------------------------------------------------------------------

/**
 * Loads onboarding event key → display name map from tests/helpers/analytics/helpers.ts.
 *
 * @returns {Promise<Record<string, string>>}
 */
async function loadOnboardingEventsMap() {
  const raw = await readFile(PATH_ONBOARDING_EVENTS, 'utf8');
  const marker = 'export const onboardingEvents = {';
  const idx = raw.indexOf(marker);
  if (idx === -1) return {};
  const start = raw.indexOf('{', idx);
  let depth = 0;
  let i = start;
  for (; i < raw.length; i += 1) {
    const c = raw[i];
    if (c === '{') depth += 1;
    else if (c === '}') {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  const body = raw.slice(start + 1, i);
  const map = {};
  for (const m of body.matchAll(/(\w+)\s*:\s*(?:\r?\n\s*)?['"]([^'"]+)['"]\s*,?/g)) {
    map[m[1]] = m[2];
  }
  return map;
}

/**
 * @param {string} source
 * @returns {Record<string, string>}
 */
function parseConstStringLiterals(source) {
  const out = {};
  for (const m of source.matchAll(/\bconst\s+(\w+)\s*=\s*['"]([^'"]+)['"]\s*;/g)) {
    out[m[1]] = m[2];
  }
  return out;
}

/**
 * Event names from declarative `*.analytics.ts` modules (onboarding refs, `name:` entries, event arrays).
 *
 * @param {string} source
 * @param {Record<string, string>} onboardingMap
 * @param {Set<string>} out
 */
function collectFromDeclarativeExpectationsSource(source, onboardingMap, out) {
  const strConsts = parseConstStringLiterals(source);

  for (const m of source.matchAll(/\bonboardingEvents\.(\w+)/g)) {
    const v = onboardingMap[m[1]];
    if (v) out.add(v);
  }
  for (const m of source.matchAll(/\bname:\s*['"]([^'"]+)['"]/g)) {
    out.add(m[1]);
  }
  for (const m of source.matchAll(/\bname:\s*onboardingEvents\.(\w+)/g)) {
    const v = onboardingMap[m[1]];
    if (v) out.add(v);
  }
  for (const m of source.matchAll(/\bname:\s*(\w+)\s*,/g)) {
    const v = strConsts[m[1]];
    if (v) out.add(v);
  }

  const reArrays = /\bconst\s+(\w+)\s*=\s*\[([\s\S]*?)\];/g;
  let am;
  while ((am = reArrays.exec(source)) !== null) {
    const varName = am[1];
    const inner = am[2];
    const looksLikeEventList =
      /(?:event|Event|Expected|expectation|analytics|Names)/.test(varName) ||
      /\bonboardingEvents\b|\bexpectedEvents\b/.test(inner);
    if (!looksLikeEventList) continue;
    for (const part of inner.split(',')) {
      const t = part.replace(/^\s+|\s+$/g, '');
      if (!t) continue;
      const lit = t.match(/^['"]([^'"]+)['"]$/);
      if (lit) {
        out.add(lit[1]);
        continue;
      }
      const onb = t.match(/^onboardingEvents\.(\w+)$/);
      if (onb && onboardingMap[onb[1]]) {
        out.add(onboardingMap[onb[1]]);
        continue;
      }
      if (strConsts[t]) out.add(strConsts[t]);
    }
  }
}

/**
 * @param {string} source
 * @returns {Record<string, Record<string, string>>} enumName -> (member -> string value)
 */
function parseEnumStringMembers(source) {
  const enums = {};
  const re = /\benum\s+(\w+)\s*\{/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    const enumName = m[1];
    const start = source.indexOf('{', m.index);
    let depth = 0;
    let i = start;
    for (; i < source.length; i += 1) {
      const c = source[i];
      if (c === '{') depth += 1;
      else if (c === '}') {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    const inner = source.slice(start + 1, i);
    const members = {};
    for (const em of inner.matchAll(/\b(\w+)\s*=\s*['"]([^'"]+)['"]\s*,?/g)) {
      members[em[1]] = em[2];
    }
    if (Object.keys(members).length > 0) enums[enumName] = members;
  }
  return enums;
}

/**
 * @param {string} source
 * @returns {Record<string, Record<string, string>>}
 */
function parseConstObjectStringValues(source) {
  const maps = {};
  const re = /\bconst\s+(\w+)\s*=\s*\{/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    const start = source.indexOf('{', m.index);
    let depth = 0;
    let i = start;
    for (; i < source.length; i += 1) {
      const c = source[i];
      if (c === '{') depth += 1;
      else if (c === '}') {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    const inner = source.slice(start + 1, i);
    const props = {};
    for (const km of inner.matchAll(/\b(\w+)\s*:\s*['"]([^'"]+)['"]\s*,?/g)) {
      props[km[1]] = km[2];
    }
    const varName = m[1];
    if (Object.keys(props).length > 0) maps[varName] = props;
  }
  return maps;
}

/**
 * @param {string} token
 * @param {Record<string, string>} onboardingMap
 * @param {Record<string, Record<string, string>>} enums
 * @param {Record<string, Record<string, string>>} objectMaps
 * @param {Record<string, string>} strConsts
 * @returns {string|null}
 */
function resolveLegacyMetaMetricsToken(token, onboardingMap, enums, objectMaps, strConsts) {
  const t = token.replace(/^\s+|\s+$/g, '');
  if (!t) return null;
  const lit = t.match(/^['"]([^'"]+)['"]$/);
  if (lit) return lit[1];
  const onb = t.match(/^onboardingEvents\.(\w+)$/);
  if (onb && onboardingMap[onb[1]]) return onboardingMap[onb[1]];
  const qual = t.match(/^(\w+)\.(\w+)$/);
  if (qual) {
    const [, base, mem] = qual;
    if (enums[base]?.[mem]) return enums[base][mem];
    if (objectMaps[base]?.[mem]) return objectMaps[base][mem];
  }
  if (strConsts[t]) return strConsts[t];
  return null;
}

/**
 * Inline MetaMetrics checks in specs (getEventsPayloads, `event.event ===`, enums, etc.).
 *
 * @param {string} source
 * @param {Record<string, string>} onboardingMap
 * @param {Set<string>} out
 */
function collectFromLegacyInlineAnalyticsSource(source, onboardingMap, out) {
  const enums = parseEnumStringMembers(source);
  const strConsts = parseConstStringLiterals(source);
  const objectMaps = parseConstObjectStringValues(source);

  for (const m of source.matchAll(/\bonboardingEvents\.(\w+)/g)) {
    const v = onboardingMap[m[1]];
    if (v) out.add(v);
  }
  for (const m of source.matchAll(/event\.event\s*===\s*['"]([^'"]+)['"]/g)) {
    out.add(m[1]);
  }
  for (const m of source.matchAll(/event\.event\s*===\s*(\w+)\.(\w+)/g)) {
    const v = resolveLegacyMetaMetricsToken(
      `${m[1]}.${m[2]}`,
      onboardingMap,
      enums,
      objectMaps,
      strConsts,
    );
    if (v) out.add(v);
  }
  for (const m of source.matchAll(/findEvent\([^,]+,\s*['"]([^'"]+)['"]/g)) {
    out.add(m[1]);
  }
  for (const m of source.matchAll(/findEvent\([^,]+,\s*onboardingEvents\.(\w+)/g)) {
    const v = onboardingMap[m[1]];
    if (v) out.add(v);
  }
  for (const m of source.matchAll(/filterEvents\(\s*[^,]+,\s*['"]([^'"]+)['"]/g)) {
    out.add(m[1]);
  }
  for (const m of source.matchAll(/filterEvents\(\s*[^,]+,\s*onboardingEvents\.(\w+)/g)) {
    const v = onboardingMap[m[1]];
    if (v) out.add(v);
  }
  for (const m of source.matchAll(/\bevent:\s*([A-Za-z_]\w*)\s*[,}]/g)) {
    const v = strConsts[m[1]];
    if (v) out.add(v);
  }
  // Allow optional args after the event array (e.g. timeout): `], 5000)` not only `])`.
  for (const m of source.matchAll(
    /getEventsPayloads\s*\(\s*[^,]+,\s*\[([\s\S]*?)\]\s*(?:,\s*[^)]+)?\s*\)/g,
  )) {
    const inner = m[1];
    for (const sm of inner.matchAll(/['"]([^'"]+)['"]/g)) {
      out.add(sm[1]);
    }
    for (const sm of inner.matchAll(/\bonboardingEvents\.(\w+)/g)) {
      const v = onboardingMap[sm[1]];
      if (v) out.add(v);
    }
    for (const part of inner.split(',')) {
      const v = resolveLegacyMetaMetricsToken(
        part,
        onboardingMap,
        enums,
        objectMaps,
        strConsts,
      );
      if (v) out.add(v);
    }
  }

  const reArrays = /\bconst\s+(\w+)\s*=\s*\[([\s\S]*?)\];/g;
  let am;
  while ((am = reArrays.exec(source)) !== null) {
    const varName = am[1];
    const inner = am[2];
    const looksLikeEventList =
      /(?:event|Event|Expected|expectation|analytics|Names)/.test(varName) ||
      /\bonboardingEvents\b|\bexpectedEvents\b/.test(inner);
    if (!looksLikeEventList) continue;
    for (const part of inner.split(',')) {
      const v = resolveLegacyMetaMetricsToken(
        part,
        onboardingMap,
        enums,
        objectMaps,
        strConsts,
      );
      if (v) out.add(v);
    }
  }
}

/**
 * @returns {Promise<Array<{ path: string, mode: 'expectations' | 'legacy' }>>}
 */
async function gatherE2EMetaMetricsSourceFiles() {
  const out = [];

  try {
    for (const f of await walkFiles(SCAN_ANALYTICS_EXPECTATIONS_DIR, (n) => n.endsWith('.ts'))) {
      out.push({ path: f, mode: 'expectations' });
    }
  } catch {
    // Sparse checkout or missing path
  }

  for (const p of LEGACY_INLINE_METAMETRICS_PATHS) {
    try {
      await access(p, fsConstants.F_OK);
      out.push({ path: p, mode: 'legacy' });
    } catch {
      // File removed or renamed — update LEGACY_INLINE_METAMETRICS_PATHS
    }
  }

  return out;
}

/**
 * Static scan for distinct MetaMetrics event display names asserted in E2E.
 *
 * @returns {Promise<{ metametrics_events_checked_unique_count: number, metametrics_events_checked_names_json: string }>}
 */
async function collectE2EMetaMetricsEventCoverage() {
  const onboardingMap = await loadOnboardingEventsMap();
  const names = new Set();
  const entries = await gatherE2EMetaMetricsSourceFiles();
  console.log(`[metametrics] scanning ${entries.length} file(s) for referenced event names`);

  for (const { path: filePath, mode } of entries) {
    const source = await readFile(filePath, 'utf8');
    if (mode === 'expectations') {
      collectFromDeclarativeExpectationsSource(source, onboardingMap, names);
    } else {
      collectFromLegacyInlineAnalyticsSource(source, onboardingMap, names);
    }
  }

  const sorted = [...names].sort((a, b) => a.localeCompare(b));
  const payload = {
    metametrics_events_checked_unique_count: sorted.length,
    metametrics_events_checked_names_json: JSON.stringify(sorted),
  };
  console.log(
    `[metametrics] ${sorted.length} unique event name(s) referenced in E2E sources`,
  );
  return payload;
}

/**
 * Top-level `metametrics` namespace in qa-stats.json (static E2E event-name coverage).
 *
 * @returns {Promise<Record<string, unknown>>}
 */
async function collectMetametricsQaStats() {
  try {
    return await collectE2EMetaMetricsEventCoverage();
  } catch (err) {
    console.warn(`[metametrics] static scan failed, skipping namespace: ${err.message}`);
    return {};
  }
}

/**
 * Extracts a feature folder name from a Jest test file path.
 *
 * Priority:
 *   app/components/UI/<Feature>/  → <Feature> (e.g. Bridge, Perps, Earn)
 *   app/components/Views/<Feature>/ → <Feature> (e.g. Wallet, AssetDetails)
 *   app/<folder>/                 → <folder>  (e.g. util, core, hooks)
 *
 * @param {string} testFilePath
 * @returns {string}
 */
function getFeatureFolder(testFilePath) {
  const normalize = (s) => s.toLowerCase().replace(/-/g, '_');
  // app/components/UI/<Feature>/  → <Feature>
  const uiMatch = testFilePath.match(/app\/components\/UI\/([^/]+)/);
  if (uiMatch) return normalize(uiMatch[1]);
  // app/components/Views/<Feature>/ → <Feature>
  const viewsMatch = testFilePath.match(/app\/components\/Views\/([^/]+)/);
  if (viewsMatch) return normalize(viewsMatch[1]);
  // app/components/<other>/ → components_<other> (e.g. components_snaps, components_hooks)
  const componentsMatch = testFilePath.match(/app\/components\/([^/]+)/);
  if (componentsMatch) return `components_${normalize(componentsMatch[1])}`;
  // app/<folder>/ → <folder> (e.g. core, util, store, selectors, component_library)
  const appMatch = testFilePath.match(/app\/([^/]+)/);
  return appMatch ? normalize(appMatch[1]) : 'other';
}

/**
 * Downloads all shard artifacts matching artifactPattern, reads the
 * jest-results.json from each, and returns test counts grouped by feature folder.
 *
 * Folders whose total count is below minFolderCount are merged into `other`
 * to reduce noise (useful for unit tests which have hundreds of component-level folders).
 *
 * @param {RegExp} artifactPattern
 * @param {string} label — used in log messages
 * @param {number} [minFolderCount=0] — folders with fewer tests are bucketed into `other`
 * @returns {Promise<Record<string, number>>}
 */
async function collectShardCounts(artifactPattern, label, minFolderCount = 0) {
  const artifacts = await getArtifactList();
  const shardArtifacts = artifacts.filter((a) => artifactPattern.test(a.name));
  console.log(`[${label}] found ${shardArtifacts.length} shard artifact(s)`);

  if (shardArtifacts.length === 0) return {};

  const folderCounts = {};
  let total = 0;

  for (const artifact of shardArtifacts) {
    const destDir = await downloadArtifact(artifact.name);
    const raw = await readFile(join(destDir, 'jest-results.json'), 'utf8');
    const { testResults } = JSON.parse(raw);
    // Jest --json CLI output uses `name` for the file path and `assertionResults`
    // for per-test outcomes (not numPassingTests/numFailingTests which are top-level aggregates).
    for (const { name, assertionResults } of testResults) {
      const passed = assertionResults.filter((r) => r.status === 'passed').length;
      const failed = assertionResults.filter((r) => r.status === 'failed').length;
      const count = passed + failed;
      total += count;
      const folder = getFeatureFolder(name);
      folderCounts[folder] = (folderCounts[folder] ?? 0) + count;
    }
  }

  console.log(`[${label}] total: ${total}`);
  const result = { total_tests_run: total };
  for (const [folder, count] of Object.entries(folderCounts)) {
    if (minFolderCount > 0 && count < minFolderCount) {
      result.other_tests_run = (result.other_tests_run ?? 0) + count;
    } else {
      result[`${folder}_tests_run`] = count;
    }
  }
  return result;
}

async function collectComponentViewTestCount() {
  console.log('[component-view] collecting per-suite counts from shard artifacts...');
  const result = await collectShardCounts(/^coverage-cv-\d+$/, 'component-view');
  if (Object.keys(result).length === 0) return result;

  const isViewTestFile = (name) => PATTERN_CV_TEST_FILE.test(name);
  const files = await walkFiles(SCAN_APP_DIR, isViewTestFile);
  let defined = 0, skips = 0;
  for (const f of files) {
    const source = await readFile(f, 'utf8');
    defined += countDefinedTests(source);
    skips += countSkips(source);
  }
  result.total_tests_defined = defined;
  result.total_tests_skipped = skips;

  // Coverage from the pre-computed nyc json-summary report produced by
  // the merge-unit-and-component-view-tests job in ci.yml.
  try {
    const destDir = await downloadArtifact('cv-test-coverage-summary');
    const summary = JSON.parse(await readFile(join(destDir, 'coverage-summary.json'), 'utf8'));
    const { lines, statements, branches, functions } = summary.total;
    result.coverage_line = Math.round(lines.pct * 10) / 10;
    result.coverage_statement = Math.round(statements.pct * 10) / 10;
    result.coverage_branch = Math.round(branches.pct * 10) / 10;
    result.coverage_function = Math.round(functions.pct * 10) / 10;
    console.log(
      `[component-view] coverage — line: ${result.coverage_line}%, stmt: ${result.coverage_statement}%, branch: ${result.coverage_branch}%, fn: ${result.coverage_function}%`,
    );
  } catch (err) {
    console.warn(`[component-view] coverage summary not available, skipping: ${err.message}`);
  }

  return result;
}

async function collectUnitTestCount() {
  console.log('[unit] collecting per-suite counts from shard artifacts...');
  // minFolderCount=200: buckets individual component-level folders into `other`,
  // keeping only meaningful team-level categories (bridge, perps, confirmations, etc.)
  const result = await collectShardCounts(/^coverage-unit-\d+$/, 'unit', 200);
  if (Object.keys(result).length === 0) return result;

  // Unit test files: *.test.{ts,tsx,js} excluding *.view[.*].test.*
  const isUnitTestFile = (name) =>
    PATTERN_UNIT_TEST_FILE.test(name) && !PATTERN_CV_TEST_FILE.test(name);
  const files = await walkFiles(SCAN_APP_DIR, isUnitTestFile);
  let defined = 0, skips = 0;
  for (const f of files) {
    const source = await readFile(f, 'utf8');
    defined += countDefinedTests(source);
    skips += countSkips(source);
  }
  result.total_tests_defined = defined;
  result.total_tests_skipped = skips;

  // Coverage from the pre-computed nyc json-summary report produced by
  // the merge-unit-and-component-view-tests job in ci.yml.
  try {
    const destDir = await downloadArtifact('unit-test-coverage-summary');
    const summary = JSON.parse(await readFile(join(destDir, 'coverage-summary.json'), 'utf8'));
    const { lines, statements, branches, functions } = summary.total;
    result.coverage_line = Math.round(lines.pct * 10) / 10;
    result.coverage_statement = Math.round(statements.pct * 10) / 10;
    result.coverage_branch = Math.round(branches.pct * 10) / 10;
    result.coverage_function = Math.round(functions.pct * 10) / 10;
    console.log(
      `[unit] coverage — line: ${result.coverage_line}%, stmt: ${result.coverage_statement}%, branch: ${result.coverage_branch}%, fn: ${result.coverage_function}%`,
    );
  } catch (err) {
    console.warn(`[unit] coverage summary not available, skipping: ${err.message}`);
  }

  return result;
}

/**
 * Parses a JUnit artifact name into canonical E2E dimensions.
 *
 * Returns null for non-E2E artifacts.
 *
 * @param {string} artifactName
 * @returns {{ channel: 'main'|'flask', platform: 'android'|'ios', suiteTag: string|null } | null}
 */
function getE2EArtifactDimensions(artifactName) {
  const match = artifactName.match(/^test-e2e-(.+)-junit-results$/);
  if (!match) return null;

  let jobName = match[1];
  // Strip the default 'main-' prefix applied by run-e2e-workflow.yml
  if (jobName.startsWith('main-')) {
    jobName = jobName.slice('main-'.length);
  }

  const flaskMatch = jobName.match(/^flask-(android|ios)-smoke-\d+$/);
  if (flaskMatch) {
    return { channel: 'flask', platform: flaskMatch[1], suiteTag: null };
  }

  const mainMatch = jobName.match(/^(.+)-(android|ios)-smoke-\d+$/);
  if (!mainMatch) return null;

  return {
    channel: 'main',
    platform: mainMatch[2],
    suiteTag: mainMatch[1].replace(/-/g, '_'),
  };
}

function getNumericAttribute(tag, name) {
  const match = tag.match(new RegExp(`${name}="(\\d+)"`));
  return match ? Number(match[1]) : 0;
}

function countExecutedTestsFromJUnitXml(rawXml) {
  const suiteTags = rawXml.match(/<testsuite\b[^>]*>/g) ?? [];
  return suiteTags.reduce((total, suiteTag) => {
    const tests = getNumericAttribute(suiteTag, 'tests');
    const skipped = getNumericAttribute(suiteTag, 'skipped');
    return total + Math.max(0, tests - skipped);
  }, 0);
}

// Collects all E2E test counts from JUnit artifacts.
async function collectE2ECounts() {
  const artifacts = await getArtifactList();

  // Per-platform counts for health signalling
  const platformCounts = {
    main: { android: 0, ios: 0 },
    flask: { android: 0, ios: 0 },
  };
  // Per-suite counts from Android only (canonical unique count)
  const suiteCounts = {};

  const e2eArtifacts = artifacts.filter((a) => getE2EArtifactDimensions(a.name));
  console.log(`[e2e] found ${e2eArtifacts.length} JUnit artifact(s)`);

  if (e2eArtifacts.length === 0) {
    console.log(
      '[e2e] no JUnit artifacts found — skipping JUnit-based e2e counts (see `metametrics` namespace for static event coverage)',
    );
    return {};
  }

  for (const artifact of e2eArtifacts) {
    const { channel, platform, suiteTag } = getE2EArtifactDimensions(artifact.name);

    const destDir = await downloadArtifact(artifact.name);
    const junitXml = await readFile(join(destDir, 'junit.xml'), 'utf8');
    const count = countExecutedTestsFromJUnitXml(junitXml);
    console.log(`[e2e] ${artifact.name}: ${count} test(s)`);

    platformCounts[channel][platform] += count;

    // Per-suite breakdown uses Android only to represent unique test count
    if (channel === 'main' && platform === 'android' && suiteTag) {
      suiteCounts[suiteTag] = (suiteCounts[suiteTag] ?? 0) + count;
    }
  }

  const androidMain = platformCounts.main.android;
  const iosMain = platformCounts.main.ios;
  const androidFlask = platformCounts.flask.android;
  const iosFlask = platformCounts.flask.ios;

  const result = {};

  // Canonical unique counts (Android as source of truth — same tests run on iOS)
  // A missing key means that channel did not run; present-but-zero means it ran and found nothing.
  if (androidMain > 0 || iosMain > 0) {
    result.main_tests_run = androidMain; // unique count
    result.main_android_tests_run = androidMain; // platform health signal
    result.main_ios_tests_run = iosMain; // drops to 0 if iOS infrastructure is broken
  }
  if (androidFlask > 0 || iosFlask > 0) {
    result.flask_tests_run = androidFlask; // unique count
    result.flask_android_tests_run = androidFlask;
    result.flask_ios_tests_run = iosFlask;
  }
  result.total_tests_run = androidMain + androidFlask;

  for (const [tag, count] of Object.entries(suiteCounts)) {
    result[`${tag}_tests_run`] = count;
  }

  // Static scan — independent of which platform/channel ran
  const isSpecTs = (name) => PATTERN_E2E_SPEC_FILE.test(name);
  let defined = 0, skips = 0;
  for (const dir of SCAN_E2E_SMOKE_DIRS) {
    const files = await walkFiles(dir, isSpecTs);
    for (const f of files) {
      const source = await readFile(f, 'utf8');
      defined += countDefinedTests(source);
      skips += countSkips(source);
    }
  }
  result.total_tests_defined = defined;
  result.total_tests_skipped = skips;

  return result;
}

/**
 * Counts executed performance scenarios by scanning *.spec.js files
 * under tests/performance/ and counting non-skipped test() calls.
 *
 * The top-level subdirectory (login, onboarding, mm-connect) determines the
 * category for per-category metrics.
 */
async function collectPerformanceTestCounts() {
  console.log('[performance] scanning tests/performance/ for scenarios...');

  const categoryCounts = {};
  let totalSkips = 0;

  async function scanDir(dir, category) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        // Top-level subdirectory determines the category
        await scanDir(fullPath, category ?? entry.name);
      } else if (entry.isFile() && PATTERN_PERF_SPEC_FILE.test(entry.name)) {
        const source = await readFile(fullPath, 'utf8');
        // Count all test() calls — including test.skip() — for total_tests_defined
        const matches = source.match(/^\s*test(?:\.skip)?\s*\(/gm) ?? [];
        const count = matches.length;
        if (count > 0 && category) {
          const key = category.replace(/-/g, '_');
          categoryCounts[key] = (categoryCounts[key] ?? 0) + count;
        }
        totalSkips += countSkips(source);
      }
    }
  }

  await scanDir(SCAN_PERFORMANCE_DIR, null);

  const total = Object.values(categoryCounts).reduce((s, n) => s + n, 0);

  const result = { total_tests_defined: total, total_tests_skipped: totalSkips };
  for (const [cat, count] of Object.entries(categoryCounts)) {
    result[`${cat}_tests_defined`] = count;
    console.log(`[performance] ${cat}: ${count}`);
  }
  console.log(`[performance] total: ${total}, skips: ${totalSkips}`);
  return result;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const stats = {};

  const collectors = [
    { namespace: 'unit', collect: collectUnitTestCount },
    { namespace: 'component_view', collect: collectComponentViewTestCount },
    { namespace: 'e2e', collect: collectE2ECounts },
    { namespace: 'metametrics', collect: collectMetametricsQaStats },
    { namespace: 'performance', collect: collectPerformanceTestCounts },
  ];

  for (const { namespace, collect } of collectors) {
    try {
      const nested = await collect();
      if (Object.keys(nested).length === 0) continue;
      stats[namespace] = nested;
    } catch (err) {
      // namespace will not be present in the output if the collector fails
      console.error(`[${namespace}] collector failed, skipping:`, err.message);
    }
  }

  const outputPath = './qa-stats.json';
  await writeFile(outputPath, JSON.stringify(stats, null, 2), 'utf8');
  console.log(`✅ QA stats written to ${outputPath}:`, stats);
}

main().catch((err) => {
  console.error('\n❌ Unexpected error:', err);
  process.exit(1);
});
