#!/usr/bin/env node
/**
 * Maps GitHub Secrets to environment variables based on builds.yml config.
 * Runs at workflow runtime (during the "Set secrets" step).
 *
 * Reads CONFIG_SECRETS (the build's secrets map from builds.yml) and looks up
 * each GitHub secret by name in process.env, then injects each mapped secret
 * value into GITHUB_ENV so subsequent steps (e.g. build.sh) see them.
 *
 * The calling step must pass every secret name referenced in builds.yml as an
 * env var of the same name (`NAME: ${{ secrets.NAME }}`).
 *
 * CONFIG_SECRETS format: { "ENV_VAR_NAME": "GITHUB_SECRET_NAME", ... }
 */

const fs = require('fs');

const secretsMapping = JSON.parse(process.env.CONFIG_SECRETS || '{}');
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

const entries = Object.entries(secretsMapping);
let found = 0;

entries.forEach(([envVar, secretName]) => {
  const value = process.env[secretName];
  if (value) {
    appendToGithubEnv(envVar, value);
    found += 1;
    console.log(`✓ ${envVar}`);
  } else {
    console.warn(`⚠ ${secretName} not found (for ${envVar})`);
  }
});

// None resolving means the step did not receive any secrets, which would
// produce a signed binary with no Infura ID, Sentry DSN, or RPC failover URLs.
if (entries.length > 0 && found === 0) {
  // GitHub Actions annotation so the error surfaces on the run summary.
  console.error(
    '::error title=Secret injection failed::No mapped secret was found in the step environment.',
  );
  process.exit(1);
}
