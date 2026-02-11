#!/usr/bin/env node
/**
 * Validates that all secrets required by the current build (from builds.yml)
 * are defined and applied in the environment. Used in CI before "Set secrets"
 * to fail fast and cancel the build if any required secret is missing or not
 * applied from GitHub.
 *
 * Fails when:
 * - A secret is not in the environment (e.g. not in the workflow env block).
 * - A secret is in the environment but empty (e.g. not set in GitHub Environment).
 *
 * Reads CONFIG_SECRETS (same format as set-secrets-from-config.js):
 *   { "ENV_VAR_NAME": "GITHUB_SECRET_NAME", ... }
 *
 * Exits 0 if every secret has a non-empty value; exits 1 otherwise.
 */

const secretsMapping = JSON.parse(process.env.CONFIG_SECRETS || '{}');
const missing = [];
const notApplied = [];

for (const [envVar, secretName] of Object.entries(secretsMapping)) {
  const value = process.env[secretName];
  if (value === undefined || value === null) {
    missing.push({ envVar, secretName });
  } else if (String(value).trim() === '') {
    notApplied.push({ envVar, secretName });
  }
}

const invalid = missing.length + notApplied.length;
if (invalid > 0) {
  console.error(
    'Build validation failed: required secrets are not defined or not applied from GitHub.',
  );
  if (missing.length > 0) {
    console.error('Not in environment:');
    missing.forEach(({ envVar, secretName }) => {
      console.error(`  - ${secretName} (for ${envVar})`);
    });
  }
  if (notApplied.length > 0) {
    console.error('In environment but empty (not set in GitHub Environment):');
    notApplied.forEach(({ envVar, secretName }) => {
      console.error(`  - ${secretName} (for ${envVar})`);
    });
  }
  console.error(
    'Ensure these secrets are set in the GitHub Environment for this build and included in the workflow env.',
  );
  process.exit(1);
}

console.log(
  `All ${Object.keys(secretsMapping).length} required secret(s) are defined and applied.`,
);
