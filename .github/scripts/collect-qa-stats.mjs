#!/usr/bin/env node
/**
 *
 * Collects QA metrics from a CI run and writes qa-stats.json, key: value format.
 * Metrics that could not be collected (missing artifacts, tests did not run)
 * are omitted from the output — they will never appear as zero.
 *
 * Required env vars:
 *   GITHUB_TOKEN      — GitHub Actions token for API access
 *   WORKFLOW_RUN_ID   — ID of the main CI run that produced tests artifacts
 * 
 * How to add a new metric:
 *   1. Add a collector function that returns a plain object
 *   2. Register it in the collectors array in main()
 * 
 * The only rule: never rename existing keys. The DB key is (project, run_id, namespace, metric_key). 
 * Renaming a key in the JSON creates a new series in the DB while the old name stops getting new data, 
 * which breaks the Grafana time series continuity. Adding and removing keys is fine.
 * 
 * Example output:
 *   {
 *     "component_view": { "tests_count": 94 },
 *     "unit":           { "tests_count": 41957 },
 *     "e2e":            { "tests_count": 420, "main_tests_count": 276, "confirmations_tests_count": 62, "flask_tests_count": 144 },
 *     "performance":    { "tests_count": 21, "login_tests_count": 11, "onboarding_tests_count": 4, "mm_connect_tests_count": 6 }
 *   }
 */

import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import { execSync } from 'child_process';
import { join } from 'path';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const WORKFLOW_RUN_ID = process.env.WORKFLOW_RUN_ID;

if (!WORKFLOW_RUN_ID) throw new Error('Missing required WORKFLOW_RUN_ID env var');
if (!GITHUB_TOKEN) throw new Error('Missing required GITHUB_TOKEN env var');


// ---------------------------------------------------------------------------
// GitHub artifact helpers
// ---------------------------------------------------------------------------

let _artifactList = null;

/**
 * Fetches (and caches) the list of artifact names for the triggering CI run.
 * First call fetches and stores, every subsequent call returns the cached value.
 * 
 * @returns {Promise<Array>}
 */
async function getArtifactList() {
  if (_artifactList) return _artifactList;

  const artifacts = [];
  let page = 1;

  while (true) {
    const url = `https://api.github.com/repos/MetaMask/metamask-mobile/actions/runs/${WORKFLOW_RUN_ID}/artifacts?per_page=100&page=${page}`;
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

  if (!artifact) {
    throw new Error(
      `Artifact "${artifactName}" not found in run ${WORKFLOW_RUN_ID}`,
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
  // app/components/UI/<Feature>/  → <Feature>
  const uiMatch = testFilePath.match(/app\/components\/UI\/([^/]+)/);
  if (uiMatch) return uiMatch[1].toLowerCase();
  // app/components/Views/<Feature>/ → <Feature>
  const viewsMatch = testFilePath.match(/app\/components\/Views\/([^/]+)/);
  if (viewsMatch) return viewsMatch[1].toLowerCase();
  // app/components/<other>/ → components_<other> (e.g. components_snaps, components_hooks)
  const componentsMatch = testFilePath.match(/app\/components\/([^/]+)/);
  if (componentsMatch) return `components_${componentsMatch[1].toLowerCase()}`;
  // app/<folder>/ → <folder> (e.g. core, util, store, selectors)
  const appMatch = testFilePath.match(/app\/([^/]+)/);
  return appMatch ? appMatch[1].toLowerCase() : 'other';
}

/**
 * Downloads all shard artifacts matching artifactPattern, reads the
 * jest-results.json from each, and returns test counts grouped by feature folder.
 *
 * @param {RegExp} artifactPattern
 * @param {string} label — used in log messages
 * @returns {Promise<Record<string, number>>}
 */
async function collectShardCounts(artifactPattern, label) {
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
    for (const { testFilePath, numPassingTests, numFailingTests } of testResults) {
      const count = numPassingTests + numFailingTests;
      total += count;
      const folder = getFeatureFolder(testFilePath);
      folderCounts[folder] = (folderCounts[folder] ?? 0) + count;
    }
  }

  console.log(`[${label}] total: ${total}`);
  const result = { tests_count: total };
  for (const [folder, count] of Object.entries(folderCounts)) {
    result[`${folder}_tests_count`] = count;
  }
  return result;
}

async function collectComponentViewTestCount() {
  console.log('[component-view] collecting per-suite counts from shard artifacts...');
  return collectShardCounts(/^coverage-cv-\d+$/, 'component-view');
}

async function collectUnitTestCount() {
  console.log('[unit] collecting per-suite counts from shard artifacts...');
  return collectShardCounts(/^coverage-unit-\d+$/, 'unit');
}

/**
 * Parses a JUnit artifact name into canonical E2E dimensions.
 *
 * Returns null for non-E2E artifacts.
 *
 * @param {string} artifactName
 * @returns {{ channel: 'main'|'flask', suiteTag: string|null } | null}
 */
function getE2EArtifactDimensions(artifactName) {
  const match = artifactName.match(/^test-e2e-(.+)-junit-results$/);
  if (!match) return null;

  let jobName = match[1];
  // Strip the default 'main-' prefix applied by run-e2e-workflow.yml
  if (jobName.startsWith('main-')) {
    jobName = jobName.slice('main-'.length);
  }

  if (/^flask-(?:android|ios)-smoke-\d+$/.test(jobName)) {
    return { channel: 'flask', suiteTag: null };
  }

  const mainMatch = jobName.match(/^(.+)-(?:android|ios)-smoke-\d+$/);
  if (!mainMatch) return null;

  return {
    channel: 'main',
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

  let mainCount = 0;
  let flaskCount = 0;
  const suiteCounts = {};

  const e2eArtifacts = artifacts.filter((a) => getE2EArtifactDimensions(a.name));
  console.log(`[e2e] found ${e2eArtifacts.length} JUnit artifact(s)`);

  if (e2eArtifacts.length === 0) {
    console.log('[e2e] no JUnit artifacts found — E2E tests did not run, skipping e2e metrics');
    return {};
  }

  for (const artifact of e2eArtifacts) {
    const dimensions = getE2EArtifactDimensions(artifact.name);

    const destDir = await downloadArtifact(artifact.name);
    const junitXml = await readFile(join(destDir, 'junit.xml'), 'utf8');
    const count = countExecutedTestsFromJUnitXml(junitXml);
    console.log(`[e2e] ${artifact.name}: ${count} test(s)`);

    if (dimensions.channel === 'main') {
      mainCount += count;
      suiteCounts[dimensions.suiteTag] = (suiteCounts[dimensions.suiteTag] ?? 0) + count;
    } else if (dimensions.channel === 'flask') {
      flaskCount += count;
    }
  }

  const result = {
    main_tests_count: mainCount,
    flask_tests_count: flaskCount,
    tests_count: mainCount + flaskCount,
  };

  for (const [tag, count] of Object.entries(suiteCounts)) {
    result[`${tag}_tests_count`] = count;
  }

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

  async function scanDir(dir, category) {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        // Top-level subdirectory determines the category
        await scanDir(fullPath, category ?? entry.name);
      } else if (entry.isFile() && entry.name.endsWith('.spec.js')) {
        const source = await readFile(fullPath, 'utf8');
        // Count test() calls, excluding test.skip()
        const matches = source.match(/^\s*test\s*\(/gm) ?? [];
        const count = matches.length;
        if (count > 0 && category) {
          const key = category.replace(/-/g, '_');
          categoryCounts[key] = (categoryCounts[key] ?? 0) + count;
        }
      }
    }
  }

  await scanDir('tests/performance', null);

  const total = Object.values(categoryCounts).reduce((s, n) => s + n, 0);

  const result = { tests_count: total };
  for (const [cat, count] of Object.entries(categoryCounts)) {
    result[`${cat}_tests_count`] = count;
    console.log(`[performance] ${cat}: ${count}`);
  }
  console.log(`[performance] total: ${total}`);
  return result;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const stats = {};

  const collectors = [
    { namespace: 'component_view', collect: collectComponentViewTestCount },
    { namespace: 'unit', collect: collectUnitTestCount },
    { namespace: 'e2e', collect: collectE2ECounts },
    { namespace: 'performance', collect: collectPerformanceTestCounts },
  ];

  for (const { namespace, collect, scalar } of collectors) {
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
