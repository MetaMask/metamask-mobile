#!/usr/bin/env node
/**
 * Maps GitHub Secrets to environment variables based on builds.yml config.
 * Runs at workflow runtime (during the "Set secrets" step).
 *
 * Reads CONFIG_SECRETS (the build's secrets map from builds.yml) and injects each
 * mapped secret value into GITHUB_ENV so subsequent steps (e.g. build.sh) see them.
 *
 * Secret values are read from the step's own environment, where the workflow maps
 * each secret explicitly (`NAME: ${{ secrets.NAME }}`). Workflows that still pass
 * the whole secrets context as ALL_SECRETS (toJSON(secrets)) are read from that.
 *
 * CONFIG_SECRETS format: { "ENV_VAR_NAME": "GITHUB_SECRET_NAME", ... }
 */

const fs = require('fs');

// No fallback when ALL_SECRETS is present but empty: an unresolved toJSON(secrets)
// expands to an empty string, and defaulting it to {} would skip every secret while
// still exiting 0 — producing a signed binary with no Infura ID, Sentry DSN, or RPC
// failover URLs.
if ('ALL_SECRETS' in process.env && !process.env.ALL_SECRETS) {
  // GitHub Actions annotation so the error surfaces on the run summary.
  console.error(
    '::error title=Secret injection failed::ALL_SECRETS is empty. Expected toJSON(secrets).',
  );
  process.exit(1);
}

const secretsMapping = JSON.parse(process.env.CONFIG_SECRETS || '{}');
const allSecrets = process.env.ALL_SECRETS
  ? JSON.parse(process.env.ALL_SECRETS)
  : process.env;
const githubEnvPath = process.env.GITHUB_ENV;

function appendToGithubEnv(name, value) {
  if (!githubEnvPath) {
    process.env[name] = value;
    return;
  }
  // Values with newlines must use delimiter format (GitHub Actions requirement)
  if (value.includes('\n') || value.includes('\r')) {
    const delimiter = `ENV_${name}_${Math.random().toString(36).slice(2, 10)}`;
    fs.appendFileSync(githubEnvPath, `${name}<<${delimiter}\n`);
    fs.appendFileSync(githubEnvPath, `${value}\n`);
    fs.appendFileSync(githubEnvPath, `${delimiter}\n`);
  } else {
    // Single-line: plain KEY=VALUE (GITHUB_ENV format; no percent-encoding needed)
    fs.appendFileSync(githubEnvPath, `${name}=${value}\n`);
  }
}

Object.entries(secretsMapping).forEach(([envVar, secretName]) => {
  const value = allSecrets[secretName];
  if (value) {
    appendToGithubEnv(envVar, value);
    console.log(`✓ ${envVar}`);
  } else {
    console.warn(`⚠ ${secretName} not found (for ${envVar})`);
  }
});
