#!/usr/bin/env node
/**
 * Validates that all secrets required by the current build (from builds.yml)
 * are defined, non-empty, and free of common paste artifacts (trailing
 * newlines, Windows line endings, invisible characters, etc.). Runs in CI
 * inside the step that bundles the app, before the build starts, so a
 * malformed value fails fast instead of being baked into the build.
 *
 * Each secret is read from the environment variable the step maps it to, so
 * this also fails when builds.yml lists a secret the step does not map. A
 * secret that is not set in GitHub arrives as an empty string.
 *
 * Reads CONFIG_SECRETS (the build's `secrets` from builds.yml):
 *   { "ENV_VAR_NAME": "SECRET_NAME", ... }
 *
 * Exits 0 if every secret is present and clean; exits 1 otherwise, listing
 * every offender in a single pass so operators can fix them all at once.
 *
 * Never logs secret values or any substring of them. Reports only names,
 * byte lengths, offsets, and control-character code points.
 */

const { checkValue } = require('./lib/validate-value');

const secretsMapping = JSON.parse(process.env.CONFIG_SECRETS || '{}');

const offenders = [];

for (const [envVar, secretName] of Object.entries(secretsMapping)) {
  const issues = checkValue(secretName, process.env[envVar]);
  if (issues.length > 0) {
    offenders.push({ envVar, secretName, issues });
  }
}

if (offenders.length > 0) {
  console.error(
    'Build validation failed: one or more required secrets are missing or malformed.',
  );
  console.error('');
  for (const { envVar, secretName, issues } of offenders) {
    for (const issue of issues) {
      // GitHub Actions annotation so the error surfaces on the run summary.
      console.error(`::error title=Malformed secret::${issue.message} (mapped to ${envVar})`);
    }
    console.error(`  - ${secretName} (for ${envVar})`);
  }
  console.error('');
  console.error(
    'Common cause: pasting a value with a trailing newline or Windows (CRLF) line endings. Re-paste the value carefully and ensure no surrounding whitespace.',
  );
  process.exit(1);
}

console.log(
  `All ${Object.keys(secretsMapping).length} required secret(s) are defined and well-formed.`,
);
