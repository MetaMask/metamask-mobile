#!/usr/bin/env node
/**
 *
 * Downloads pre-aggregated QA stats artifacts from the triggering CI run via the
 * GitHub API and writes a qa-stats.json file for consumption by downstream workflows.
 *
 * Required env vars:
 *   GITHUB_TOKEN      — GitHub Actions token for API access
 *   WORKFLOW_RUN_ID   — ID of the CI run that produced the artifacts
 *
 * Example of output format of qa-stats.json:
 *   {
 *     "component_view_tests_count": 34,
 *     "unit_test_count": 679,
 *   }
 *
 * How to add a new metric:
 *   1. Add a collector function below (see existing example)
 *   2. Call it in main() and assign the result to stats
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { execSync } from 'child_process';
import { join } from 'path';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const WORKFLOW_RUN_ID = process.env.WORKFLOW_RUN_ID;

if (!WORKFLOW_RUN_ID) throw new Error('Missing required WORKFLOW_RUN_ID env var');


// ---------------------------------------------------------------------------
// GitHub artifact helpers
// ---------------------------------------------------------------------------

let _artifactList = null;

/**
 * Fetches (and caches) the list of artifacts for the triggering CI run.
 * First call fetches and stores, every subsequent call returns the cached value.
 * 
 * @returns {Promise<Array>}
 */
async function getArtifactList() {
  if (_artifactList) return _artifactList;

  const url = `https://api.github.com/repos/MetaMask/metamask-mobile/actions/runs/${WORKFLOW_RUN_ID}/artifacts`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to list artifacts: ${res.status} ${res.statusText}`);
  }

  const { artifacts } = await res.json();
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

async function collectComponentViewTestCount() {
  const destDir = await downloadArtifact('cv-test-stats');
  const raw = await readFile(join(destDir, 'cv-test-stats.json'), 'utf8');
  const data = JSON.parse(raw);
  return data.component_view_test_number;
}

async function collectUnitTestCount() {
  const destDir = await downloadArtifact('unit-test-stats');
  const raw = await readFile(join(destDir, 'unit-test-stats.json'), 'utf8');
  const data = JSON.parse(raw);
  return data.unit_test_number;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const stats = {};

  const collectors = [
    {
      key: 'component_view_tests_count',
      collect: collectComponentViewTestCount,
    },
    {
      key: 'unit_tests_count',
      collect: collectUnitTestCount,
    },
  ];

  for (const { key, collect } of collectors) {
    try {
      stats[key] = await collect();
    } catch (err) {
      // stat will not be present in the output file if the collector fails
      console.error(`[${key}] collector failed, skipping stat:`, err.message);
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
