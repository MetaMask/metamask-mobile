#!/usr/bin/env node
/**
 * Verifies that every env var mapped via builds.yml secrets for the current
 * build is free of leading/trailing whitespace (space, tab, CR, LF, plus the
 * wider ECMAScript whitespace set covered by String.prototype.trim()).
 *
 * Runs AFTER scripts/set-secrets-from-config.js (which defensively trims
 * secrets before writing them to GITHUB_ENV). If this validator fails, it
 * means a secret reached the build environment with whitespace intact —
 * either because a new code path bypassed set-secrets-from-config.js, or
 * because the defensive trim regressed. Either way, the build must not
 * proceed: trailing newlines get inlined verbatim into the JS bundle (via
 * babel-plugin-transform-inline-environment-variables) and silently break
 * OAuth client IDs, API keys, and URLs in shipped binaries.
 *
 * CI-agnostic: reads CONFIG_SECRETS (same format as set-secrets-from-config.js
 * and validate-secrets-from-config.js) to know which env var names to check:
 *   { "ENV_VAR_NAME": "SECRET_NAME", ... }
 *
 * Exits 0 when every checked env var is whitespace-clean (or unset).
 * Exits 1 when at least one env var has leading/trailing whitespace.
 *
 * Never prints secret values; logs only names and length deltas.
 */

const secretsMapping = JSON.parse(process.env.CONFIG_SECRETS || '{}');

const dirty = [];

for (const [envVar, secretName] of Object.entries(secretsMapping)) {
  const value = process.env[envVar];
  // Unset / empty env vars are validate-secrets-from-config.js's concern, not ours.
  if (value === undefined || value === '') {
    continue;
  }
  const trimmed = value.trim();
  if (trimmed.length !== value.length) {
    dirty.push({
      envVar,
      secretName,
      rawLen: value.length,
      trimmedLen: trimmed.length,
      leading: value.length - value.replace(/^\s+/, '').length,
      trailing: value.length - value.replace(/\s+$/, '').length,
    });
  }
}

if (dirty.length > 0) {
  console.error(
    `❌ ${dirty.length} environment variable(s) have leading/trailing whitespace after secret application:`,
  );
  dirty.forEach(({ envVar, secretName, rawLen, trimmedLen, leading, trailing }) => {
    console.error(
      `  - ${envVar} (from secret ${secretName}): len ${rawLen} -> ${trimmedLen} (leading=${leading}, trailing=${trailing})`,
    );
  });
  console.error('');
  console.error(
    'This should not happen: scripts/set-secrets-from-config.js trims secrets before they reach GITHUB_ENV.',
  );
  console.error(
    'Likely causes: (1) a new workflow step set one of these env vars directly from ${{ secrets.X }} and bypassed the trim;',
  );
  console.error(
    '(2) the defensive trim regressed. Fix the offending path before this build ships — trailing newlines get baked into the JS bundle.',
  );
  console.error(
    'Short-term remediation: re-save the affected GitHub secret(s) without a trailing newline.',
  );
  process.exit(1);
}

const checked = Object.keys(secretsMapping).length;
console.log(
  `✅ All ${checked} env var(s) mapped from builds.yml secrets are whitespace-clean.`,
);
