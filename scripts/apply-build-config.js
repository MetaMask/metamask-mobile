#!/usr/bin/env node
/**
 * Loads build configuration from builds.yml and exports non-secret env vars.
 * Runs at workflow runtime (during the "Apply build config" step).
 *
 * Exports: env, code_fencing, remote_feature_flags. Does NOT handle secrets
 * (those are injected by the "Set secrets" step via set-secrets-from-config.js).
 *
 * See scripts/generate-build-workflow-secrets-env.js for the maintenance script
 * that regenerates the "Set secrets" env block in build.yml from builds.yml.
 *
 * Usage:
 *   node scripts/apply-build-config.js main-prod
 *   node scripts/apply-build-config.js main-dev --export            # shell eval (current step only)
 *   node scripts/apply-build-config.js main-dev --export-github-env # append to GITHUB_ENV (later steps)
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const BUILDS_PATH = path.join(__dirname, '../.github/builds.yml');

function loadConfig(buildName) {
  if (!fs.existsSync(BUILDS_PATH)) {
    throw new Error('.github/builds.yml not found');
  }

  const config = yaml.load(fs.readFileSync(BUILDS_PATH, 'utf8'));

  if (!config.builds || !config.builds[buildName]) {
    const available = Object.keys(config.builds || {}).join(', ');
    throw new Error(`Build "${buildName}" not found. Available: ${available}`);
  }

  return config.builds[buildName];
}

function applyConfig(buildName) {
  const config = loadConfig(buildName);

  // Set all env vars from config.env
  if (config.env) {
    Object.entries(config.env).forEach(([key, value]) => {
      process.env[key] = String(value);
    });
  }

  // Set code fencing features
  if (config.code_fencing) {
    process.env.CODE_FENCING_FEATURES = JSON.stringify(config.code_fencing);
  }

  // Set remote feature flag defaults (seeded into RemoteFeatureFlagController)
  if (config.remote_feature_flags) {
    process.env.REMOTE_FEATURE_FLAG_DEFAULTS = JSON.stringify(
      config.remote_feature_flags,
    );
  }

  return config;
}

// Export for shell (used in CI)
function exportForShell(buildName) {
  const config = loadConfig(buildName);
  const lines = [];

  if (config.env) {
    Object.entries(config.env).forEach(([key, value]) => {
      lines.push(`export ${key}="${String(value)}"`);
    });
  }

  if (config.code_fencing) {
    lines.push(
      `export CODE_FENCING_FEATURES='${JSON.stringify(config.code_fencing)}'`,
    );
  }

  if (config.remote_feature_flags) {
    lines.push(
      `export REMOTE_FEATURE_FLAG_DEFAULTS='${JSON.stringify(config.remote_feature_flags)}'`,
    );
  }

  return lines.join('\n');
}

const GITHUB_ENV_DELIMITER = '__APPLY_BUILD_CONFIG_EOF__';

/**
 * Output env vars in GITHUB_ENV format so later workflow steps inherit them.
 * Uses delimiter syntax for values that contain newlines or '=' to avoid parsing issues.
 */
function exportForGitHubEnv(buildName) {
  const config = loadConfig(buildName);
  const lines = [];

  function appendVar(key, value) {
    const str = String(value);
    if (str.includes('\n') || str.includes('=')) {
      lines.push(`${key}<<${GITHUB_ENV_DELIMITER}`);
      lines.push(str);
      lines.push(GITHUB_ENV_DELIMITER);
    } else {
      lines.push(`${key}=${str}`);
    }
  }

  if (config.env) {
    Object.entries(config.env).forEach(([key, value]) => {
      appendVar(key, value);
    });
  }

  if (config.code_fencing) {
    appendVar('CODE_FENCING_FEATURES', JSON.stringify(config.code_fencing));
  }

  if (config.remote_feature_flags) {
    appendVar(
      'REMOTE_FEATURE_FLAG_DEFAULTS',
      JSON.stringify(config.remote_feature_flags),
    );
  }

  return lines.join('\n');
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const buildName = args.find((a) => !a.startsWith('--'));
  const exportMode = args.includes('--export');
  const exportGitHubEnvMode = args.includes('--export-github-env');

  if (!buildName) {
    console.error(
      'Usage: node apply-build-config.js <build-name> [--export | --export-github-env]',
    );
    console.error('Example: node apply-build-config.js main-prod');
    process.exit(1);
  }

  try {
    if (exportGitHubEnvMode) {
      console.log(exportForGitHubEnv(buildName));
    } else if (exportMode) {
      console.log(exportForShell(buildName));
    } else {
      applyConfig(buildName);
      console.log(`✅ Applied config for ${buildName}`);
    }
  } catch (error) {
    console.error(`❌ ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  loadConfig,
  applyConfig,
  exportForShell,
  exportForGitHubEnv,
};
