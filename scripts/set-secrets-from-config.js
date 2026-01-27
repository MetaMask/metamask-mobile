#!/usr/bin/env node
/**
 * Maps GitHub Secrets to environment variables based on builds.yml config.
 * Called in CI after loading CONFIG_SECRETS from the build config.
 *
 * CONFIG_SECRETS format: { "ENV_VAR_NAME": "GITHUB_SECRET_NAME", ... }
 */

const secretsMapping = JSON.parse(process.env.CONFIG_SECRETS || '{}');

Object.entries(secretsMapping).forEach(([envVar, secretName]) => {
  const value = process.env[secretName];
  if (value) {
    process.env[envVar] = value;
    console.log(`✓ ${envVar}`);
  } else {
    console.warn(`⚠ ${secretName} not found (for ${envVar})`);
  }
});
