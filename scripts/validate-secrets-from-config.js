#!/usr/bin/env node
/**
 * Validates that all secrets required by the current build (from builds.yml)
 * are defined, non-empty, and free of common paste artifacts (trailing
 * newlines, Windows line endings, invisible characters, etc.). Runs in CI
 * before "Set secrets" to fail fast and prevent a malformed value from being
 * written to GITHUB_ENV and baked into the build.
 *
 * Secrets are resolved from SECRETS_JSON when present (e.g. GitHub's
 * toJSON(secrets) blob) and fall back to individual process.env lookups so
 * the script works on any CI without extra wiring.
 *
 * Reads CONFIG_SECRETS (same format as set-secrets-from-config.js):
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
const secretsSource = process.env.SECRETS_JSON
  ? JSON.parse(process.env.SECRETS_JSON)
  : process.env;

const offenders = [];

for (const [envVar, secretName] of Object.entries(secretsMapping)) {
  const issues = checkValue(secretName, secretsSource[secretName]);
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
    'Fix each secret in GitHub > Settings > Environments > <this build\'s environment> > edit the listed secret.',
  );
  console.error(
    'Common cause: pasting a value with a trailing newline or Windows (CRLF) line endings. Re-paste the value carefully and ensure no surrounding whitespace.',
  );
  process.exit(1);
}

console.log(
  `All ${Object.keys(secretsMapping).length} required secret(s) are defined and well-formed.`,
);
