#!/usr/bin/env node
/**
 * Maps GitHub Secrets to environment variables based on builds.yml config.
 * Runs at workflow runtime (during the "Set secrets" step).
 *
 * Reads CONFIG_SECRETS (the build's secrets map from builds.yml) and ALL_SECRETS
 * (the full secrets context via toJSON(secrets)) and injects each mapped secret
 * value into GITHUB_ENV so subsequent steps (e.g. build.sh) see them.
 *
 * Using toJSON(secrets) means the workflow no longer needs an explicit per-secret
 * list — adding a secret to builds.yml and the GitHub Environment is sufficient.
 *
 * CONFIG_SECRETS format: { "ENV_VAR_NAME": "GITHUB_SECRET_NAME", ... }
 */

const fs = require('fs');

const secretsMapping = JSON.parse(process.env.CONFIG_SECRETS || '{}');
const allSecrets = JSON.parse(process.env.ALL_SECRETS || '{}');
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
