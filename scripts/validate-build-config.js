#!/usr/bin/env node
/**
 * Validates builds.yml structure. Runs in CI before builds.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { checkValue } = require('./lib/validate-value');

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

    // Hygiene checks on env values: catch trailing whitespace, stray \r,
    // invisible characters, etc. so operator typos fail CI before the build
    // fans out. Empty strings are allowed here (e.g. optional allowlists)
    // but whitespace-only values still fail.
    if (build.env && typeof build.env === 'object') {
      for (const [envKey, envVal] of Object.entries(build.env)) {
        const issues = checkValue(`${name}.env.${envKey}`, envVal, {
          allowEmpty: true,
        });
        issues.forEach((issue) => errors.push(issue.message));
      }
    }
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
