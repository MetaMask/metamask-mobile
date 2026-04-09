#!/usr/bin/env node

/**
 * Applies a risk label (risk-low / risk-medium / risk-high) to a PR based on
 * the risk level output from the Smart E2E selection step.
 *
 * Required environment variables:
 *   RISK_LEVEL          - 'low' | 'medium' | 'high'
 *   GH_TOKEN            - GitHub token with pull-requests:write and issues:write
 *   GITHUB_REPOSITORY   - owner/repo
 *   PR_NUMBER           - pull request number
 */

const RISK_LEVEL = process.env.RISK_LEVEL || '';
const GH_TOKEN = process.env.GH_TOKEN || '';
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY || '';
const PR_NUMBER = process.env.PR_NUMBER || '';

const RISK_LABELS = {
  low: {
    color: '0E8A16',
    description: 'Low testing needed · Low bug introduction risk',
  },
  medium: {
    color: 'FBCA04',
    description: 'Moderate testing recommended · Possible bug introduction risk',
  },
  high: {
    color: 'B60205',
    description: 'Extensive testing required · High bug introduction risk',
  },
};

async function githubApi(path, options = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return res;
}

async function main() {
  if (!RISK_LEVEL) {
    console.log('⏭️ No risk level provided, skipping label');
    return;
  }

  if (!RISK_LABELS[RISK_LEVEL]) {
    console.error(`❌ Unknown risk level: "${RISK_LEVEL}"`);
    process.exit(1);
  }

  if (!GH_TOKEN || !GITHUB_REPOSITORY || !PR_NUMBER) {
    console.error('❌ Missing required env: GH_TOKEN, GITHUB_REPOSITORY, PR_NUMBER');
    process.exit(1);
  }

  // Ensure all three risk labels exist on the repo (idempotent — 422 = already exists)
  for (const [level, meta] of Object.entries(RISK_LABELS)) {
    await githubApi(`/repos/${GITHUB_REPOSITORY}/labels`, {
      method: 'POST',
      body: JSON.stringify({ name: `risk-${level}`, color: meta.color, description: meta.description }),
    });
  }

  // Fetch current PR labels
  const labelsRes = await githubApi(`/repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/labels`);
  if (!labelsRes.ok) {
    const body = await labelsRes.text();
    console.error(`❌ Failed to fetch PR labels: ${labelsRes.status} ${body}`);
    process.exit(1);
  }
  const currentLabels = await labelsRes.json();

  // Remove stale risk labels
  for (const label of currentLabels) {
    if (Object.keys(RISK_LABELS).map(l => `risk-${l}`).includes(label.name)) {
      await githubApi(`/repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/labels/${encodeURIComponent(label.name)}`, {
        method: 'DELETE',
      });
      console.log(`🗑️ Removed stale label: ${label.name}`);
    }
  }

  // Add the new risk label
  const newLabel = `risk-${RISK_LEVEL}`;
  const addRes = await githubApi(`/repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/labels`, {
    method: 'POST',
    body: JSON.stringify({ labels: [newLabel] }),
  });

  if (!addRes.ok) {
    const body = await addRes.text();
    console.error(`❌ Failed to add label "${newLabel}": ${addRes.status} ${body}`);
    process.exit(1);
  }

  console.log(`✅ Applied risk label: ${newLabel}`);
}

main().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
