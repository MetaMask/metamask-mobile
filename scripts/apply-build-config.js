#!/usr/bin/env node
/**
 * Loads build configuration from builds.yml and sets environment variables.
 * Simple, no magic inheritance - each build has its full config via YAML anchors.
 *
 * Usage:
 *   node scripts/apply-build-config.js main-prod
 *   node scripts/apply-build-config.js main-dev --export  # outputs for shell eval
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

  // Set build-specific flags
  if (config.build?.ios?.is_sim_build) {
    process.env.IS_SIM_BUILD = 'true';
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

  if (config.build?.ios?.is_sim_build) {
    lines.push('export IS_SIM_BUILD="true"');
  }

  return lines.join('\n');
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const buildName = args.find((a) => !a.startsWith('--'));
  const exportMode = args.includes('--export');

  if (!buildName) {
    console.error('Usage: node apply-build-config.js <build-name> [--export]');
    console.error('Example: node apply-build-config.js main-prod');
    process.exit(1);
  }

  try {
    if (exportMode) {
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

module.exports = { loadConfig, applyConfig, exportForShell };
