#!/usr/bin/env node
/**
 * Validates builds.yml structure. Runs in CI before builds.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const BUILDS_PATH = path.join(__dirname, '../builds.yml');

function validate() {
  if (!fs.existsSync(BUILDS_PATH)) {
    console.error('❌ builds.yml not found');
    process.exit(1);
  }

  let config;
  try {
    config = yaml.load(fs.readFileSync(BUILDS_PATH, 'utf8'));
  } catch (e) {
    console.error(`❌ Invalid YAML: ${e.message}`);
    process.exit(1);
  }

  if (!config.builds || typeof config.builds !== 'object') {
    console.error('❌ builds.yml must have a "builds" section');
    process.exit(1);
  }

  const errors = [];
  const buildNames = Object.keys(config.builds);

  buildNames.forEach((name) => {
    const build = config.builds[name];

    // Required: env with METAMASK_ENVIRONMENT and METAMASK_BUILD_TYPE
    if (!build.env?.METAMASK_ENVIRONMENT) {
      errors.push(`${name}: missing env.METAMASK_ENVIRONMENT`);
    }
    if (!build.env?.METAMASK_BUILD_TYPE) {
      errors.push(`${name}: missing env.METAMASK_BUILD_TYPE`);
    }

    // Required: github_environment
    if (!build.github_environment) {
      errors.push(`${name}: missing github_environment`);
    }
  });

  // Detect which flags are VersionGatedFeatureFlag-shaped (objects with both
  // `enabled` and `minimumVersion`) across all builds. Any build that overrides
  // one of these flags MUST keep it as an object — plain booleans or other
  // primitives mean the controller can't validate them as VersionGated flags.
  const versionGatedFlagNames = new Set();
  buildNames.forEach((name) => {
    const flags = config.builds[name].remote_feature_flags;
    if (!flags) return;
    Object.entries(flags).forEach(([key, value]) => {
      if (
        value !== null &&
        typeof value === 'object' &&
        'enabled' in value &&
        'minimumVersion' in value
      ) {
        versionGatedFlagNames.add(key);
      }
    });
  });

  buildNames.forEach((name) => {
    const flags = config.builds[name].remote_feature_flags;
    if (!flags) return;
    Object.entries(flags).forEach(([key, value]) => {
      if (versionGatedFlagNames.has(key) && typeof value !== 'object') {
        errors.push(
          `${name}: remote_feature_flags.${key} must be an object ` +
            `{ enabled: bool, minimumVersion: string } but got ${JSON.stringify(value)}. ` +
            `Use "enabled: true/false" + "minimumVersion: '0.0.0'" instead of a plain boolean.`,
        );
      }
    });
  });

  if (errors.length > 0) {
    console.error('❌ Validation errors:');
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }

  console.log(`✅ Valid: ${buildNames.length} builds configured`);
  console.log(`   ${buildNames.join(', ')}`);
}

if (require.main === module) {
  validate();
}

module.exports = { validate };
