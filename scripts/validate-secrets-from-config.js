#!/usr/bin/env node
/**
 * Validates that all secrets required by the current build (from builds.yml)
 * are defined and applied. Used in CI before "Set secrets" to fail fast and
 * cancel the build if any required secret is missing or empty.
 *
 * CI-agnostic: secrets are resolved from process.env by default. Pass
 * SECRETS_JSON (a JSON object mapping secret name → value) to override,
 * e.g. when the CI platform exposes all secrets as a single JSON blob rather
 * than individual env vars.
 *
 * Fails when:
 * - A secret is absent (not in env / not in SECRETS_JSON).
 * - A secret is present but empty (defined but not set in the CI environment).
 *
 * Reads CONFIG_SECRETS (same format as set-secrets-from-config.js):
 *   { "ENV_VAR_NAME": "SECRET_NAME", ... }
 *
 * Exits 0 if every secret has a non-empty value; exits 1 otherwise.
 */

const secretsMapping = JSON.parse(process.env.CONFIG_SECRETS || '{}');
// SECRETS_JSON lets callers pass all secrets as a JSON blob (e.g. GitHub's
// toJSON(secrets)); falls back to individual process.env lookups so the script
// works on any CI without extra wiring.
const secretsSource = process.env.SECRETS_JSON
  ? JSON.parse(process.env.SECRETS_JSON)
  : process.env;
const missing = [];
const notApplied = [];

for (const [envVar, secretName] of Object.entries(secretsMapping)) {
  const value = secretsSource[secretName];
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
    'Ensure these secrets are set in the GitHub Environment for this build.',
  );
  process.exit(1);
}

console.log(
  `All ${Object.keys(secretsMapping).length} required secret(s) are defined and applied.`,
);
