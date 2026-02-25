/**
 * Reports E2E fixture validation results as a PR comment and GitHub annotation.
 *
 * Reads fixture-validation-result.json from the downloaded artifact directory,
 * posts/updates a PR comment with the results, and emits GitHub annotations.
 *
 * Environment variables:
 *   RESULTS_PATH          - Path to the downloaded artifact directory
 *   VALIDATION_RESULT     - The upstream job result (success/failure/cancelled)
 *   GITHUB_TOKEN          - GitHub token for API calls
 *   PR_NUMBER             - Pull request number (empty for non-PR events)
 *   GITHUB_REPOSITORY     - owner/repo
 *   RUN_URL               - URL to the workflow run
 */

import fs from 'node:fs';
import path from 'node:path';

const {
  RESULTS_PATH = '',
  VALIDATION_RESULT = '',
  GITHUB_TOKEN = '',
  PR_NUMBER = '',
  GITHUB_REPOSITORY = '',
  RUN_URL = '',
} = process.env;

const COMMENT_MARKER = '**E2E Fixture Validation';

function readResults() {
  const jsonPath = path.join(RESULTS_PATH, 'fixture-validation-result.json');
  if (!fs.existsSync(jsonPath)) return null;
  return JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
}

function buildComment(results) {
  if (VALIDATION_RESULT === 'failure' && !results) {
    return `❌ ${COMMENT_MARKER} — Failed**\nThe fixture validation job failed. [Review the logs](${RUN_URL})`;
  }

  if (!results) {
    if (VALIDATION_RESULT === 'success') {
      return `✅ ${COMMENT_MARKER} — Passed**\n[View details](${RUN_URL})`;
    }
    return null;
  }

  const { hasStructuralChanges, newKeys, missingKeys, typeMismatches, valueMismatches } = results;

  if (hasStructuralChanges) {
    return [
      `⚠️ ${COMMENT_MARKER} — Structural changes detected**`,
      '',
      '| Category | Count |',
      '|----------|-------|',
      `| New keys | ${newKeys} |`,
      `| Missing keys | ${missingKeys} |`,
      `| Type mismatches | ${typeMismatches} |`,
      `| Value mismatches | ${valueMismatches} (informational) |`,
      '',
      'The committed fixture schema is out of date. To update, comment:',
      '```',
      '@metamaskbot update-mobile-fixture',
      '```',
      `[View full details](${RUN_URL})`,
    ].join('\n');
  }

  if (valueMismatches > 0) {
    return `✅ ${COMMENT_MARKER} — Schema is up to date**\n${valueMismatches} value mismatches detected (expected — fixture represents an existing user).\n[View details](${RUN_URL})`;
  }

  return `✅ ${COMMENT_MARKER} — No differences found**\nFixture is up to date. [View details](${RUN_URL})`;
}

function emitAnnotation(results) {
  if (!results) {
    if (VALIDATION_RESULT === 'failure') {
      console.log('::error::Fixture validation job failed.');
    } else if (VALIDATION_RESULT === 'success') {
      console.log('::notice::Fixture validation passed.');
    }
    return;
  }

  const { hasStructuralChanges, newKeys, missingKeys, typeMismatches, valueMismatches } = results;

  if (hasStructuralChanges) {
    console.log(`::warning::Fixture schema out of date — New: ${newKeys}, Missing: ${missingKeys}, Type mismatches: ${typeMismatches}. Run @metamaskbot update-mobile-fixture`);
  } else if (valueMismatches > 0) {
    console.log(`::notice::Fixture schema up to date. ${valueMismatches} value mismatches (expected).`);
  } else {
    console.log('::notice::Fixture validation passed — no differences found.');
  }
}

async function ghApi(endpoint, options = {}) {
  const res = await fetch(`https://api.github.com${endpoint}`, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    ...options,
  });
  if (!res.ok && options.method !== 'DELETE') {
    const text = await res.text().catch(() => '');
    throw new Error(`GitHub API ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function deletePreviousComments() {
  const comments = await ghApi(`/repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/comments`);
  for (const comment of comments) {
    if (comment.body && comment.body.includes(COMMENT_MARKER)) {
      await ghApi(`/repos/${GITHUB_REPOSITORY}/issues/comments/${comment.id}`, { method: 'DELETE' });
    }
  }
}

async function postComment(body) {
  await ghApi(`/repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

async function main() {
  const results = readResults();

  // Always emit annotation
  emitAnnotation(results);

  // Post PR comment if this is a PR
  if (PR_NUMBER) {
    const comment = buildComment(results);
    if (comment) {
      await deletePreviousComments();
      await postComment(comment);
      console.log(`Posted fixture validation comment on PR #${PR_NUMBER}`);
    }
  }
}

main().catch((err) => {
  console.error('Failed to report fixture validation:', err);
  process.exit(1);
});
