#!/usr/bin/env node
/**
 * Validates builds.yml structure. Runs in CI before builds.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { checkValue } = require('./lib/validate-value');

const BUILDS_PATH = path.join(__dirname, '../builds.yml');

// Env keys in builds.yml that may legitimately be the empty string. Every
// other declared env key must have a non-empty value, so an accidental
// `PORTFOLIO_API_URL: ''` (or a botched YAML anchor merge) fails validation
// instead of shipping with a blank value. Adding to this list should be
// deliberate: the review on that PR is the gate for "yes, this key is
// intentionally optional."
const ENV_KEYS_ALLOWED_EMPTY = new Set([
  'MM_PERPS_HIP3_ALLOWLIST_MARKETS',
  'MM_PERPS_HIP3_BLOCKLIST_MARKETS',
]);

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
    // invisible characters, accidental empties, etc. so operator typos fail
    // CI before the build fans out. Strict by default; only the keys in
    // ENV_KEYS_ALLOWED_EMPTY may be the empty string. Whitespace-only values
    // always fail, since "intentionally empty" should be `''` not `'   '`.
    if (build.env && typeof build.env === 'object') {
      for (const [envKey, envVal] of Object.entries(build.env)) {
        const issues = checkValue(`${name}.env.${envKey}`, envVal, {
          allowEmpty: ENV_KEYS_ALLOWED_EMPTY.has(envKey),
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
