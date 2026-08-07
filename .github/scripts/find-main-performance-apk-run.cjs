#!/usr/bin/env node
/**
 * Finds the latest completed main-branch run of the performance E2E workflow
 * that still has both Android APK artifacts available.
 *
 * Used when reuse_main_builds resolved BrowserStack apps and TestMu still
 * needs lt:// URLs — download the same APKs that were uploaded to BrowserStack
 * and re-upload them to TestMu instead of rebuilding.
 *
 * Env:
 *   GITHUB_OUTPUT          — required (writes run_id / found)
 *   GITHUB_TOKEN / GH_TOKEN — required
 *   GITHUB_REPOSITORY      — owner/repo (default from env)
 *   WITH_SRP_ARTIFACT      — artifact name for with-SRP APK
 *   WITHOUT_SRP_ARTIFACT   — artifact name for without-SRP APK
 *   WORKFLOW_FILE          — workflow file name (default run-performance-e2e.yml)
 *   BRANCH                 — branch to search (default main)
 *   MAX_RUNS               — how many recent runs to inspect (default 30)
 *   CURRENT_RUN_ID         — skip this run id when searching
 */

const { writeFileSync, appendFileSync } = require('node:fs');

const githubOutputPath = process.env.GITHUB_OUTPUT;
if (!githubOutputPath) {
  console.error('GITHUB_OUTPUT is not set');
  process.exit(1);
}

const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;
const withSrpArtifact = process.env.WITH_SRP_ARTIFACT;
const withoutSrpArtifact = process.env.WITHOUT_SRP_ARTIFACT;
const workflowFile = process.env.WORKFLOW_FILE || 'run-performance-e2e.yml';
const branch = process.env.BRANCH || 'main';
const maxRuns = Number(process.env.MAX_RUNS || '30');
const currentRunId = process.env.CURRENT_RUN_ID || '';

if (!token) {
  console.error('GITHUB_TOKEN (or GH_TOKEN) is required');
  process.exit(1);
}
if (!repository) {
  console.error('GITHUB_REPOSITORY is required');
  process.exit(1);
}
if (!withSrpArtifact || !withoutSrpArtifact) {
  console.error('WITH_SRP_ARTIFACT and WITHOUT_SRP_ARTIFACT are required');
  process.exit(1);
}

/**
 * @param {string} path
 * @returns {Promise<unknown>}
 */
async function githubGet(path) {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? String(/** @type {{ message?: string }} */ (payload).message)
        : response.statusText;
    throw new Error(`GitHub API ${path} failed (${response.status}): ${message}`);
  }
  return payload;
}

/**
 * @param {Record<string, string>} outputs
 */
function writeOutputs(outputs) {
  const lines = Object.entries(outputs).map(([key, value]) => `${key}=${value}`);
  const body = `${lines.join('\n')}\n`;
  try {
    appendFileSync(githubOutputPath, body);
  } catch {
    writeFileSync(githubOutputPath, body);
  }
}

async function main() {
  console.log(
    `Searching ${repository} workflow=${workflowFile} branch=${branch} for artifacts:`,
  );
  console.log(`  - ${withSrpArtifact}`);
  console.log(`  - ${withoutSrpArtifact}`);

  const workflowPayload = /** @type {{ workflow_runs?: Array<{ id: number; status: string; conclusion: string | null; html_url: string }> }} */ (
    await githubGet(
      `/repos/${repository}/actions/workflows/${encodeURIComponent(workflowFile)}/runs?branch=${encodeURIComponent(branch)}&per_page=${maxRuns}`,
    )
  );

  const runs = Array.isArray(workflowPayload.workflow_runs)
    ? workflowPayload.workflow_runs
    : [];

  for (const run of runs) {
    if (String(run.id) === String(currentRunId)) {
      continue;
    }
    // Prefer completed runs; skip in-progress/queued.
    if (run.status !== 'completed') {
      continue;
    }

    const artifactsPayload = /** @type {{ artifacts?: Array<{ name: string; expired: boolean }> }} */ (
      await githubGet(`/repos/${repository}/actions/runs/${run.id}/artifacts?per_page=100`)
    );
    const artifacts = Array.isArray(artifactsPayload.artifacts)
      ? artifactsPayload.artifacts
      : [];

    const hasWithSrp = artifacts.some(
      (artifact) => artifact.name === withSrpArtifact && !artifact.expired,
    );
    const hasWithoutSrp = artifacts.some(
      (artifact) => artifact.name === withoutSrpArtifact && !artifact.expired,
    );

    if (hasWithSrp && hasWithoutSrp) {
      console.log(`Found reusable APKs on run ${run.id} (${run.html_url})`);
      writeOutputs({
        found: 'true',
        run_id: String(run.id),
      });
      return;
    }

    console.log(
      `Run ${run.id}: with-SRP=${hasWithSrp}, without-SRP=${hasWithoutSrp} — continue`,
    );
  }

  console.warn(
    'No completed main performance run with both APK artifacts was found.',
  );
  writeOutputs({ found: 'false' });
}

main().catch((error) => {
  console.error(error);
  writeOutputs({ found: 'false' });
  process.exit(0);
});
