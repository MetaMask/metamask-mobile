#!/usr/bin/env node
/**
 * Phase 1.5: Parallel Validation Script
 *
 * Verifies that builds.yml configuration matches the environment variables
 * set by the existing Bitrise remapping functions.
 *
 * Run AFTER Bitrise's old remapping sets env vars, BEFORE the actual build.
 * This validates builds.yml produces the same config as the legacy system.
 *
 * Usage:
 *   node scripts/verify-build-config.js
 *   node scripts/verify-build-config.js --strict   # Exit with error on mismatch
 *   node scripts/verify-build-config.js --verbose  # Show all comparisons
 *
 * Expected env vars (set by Bitrise before this script runs):
 *   METAMASK_BUILD_TYPE: "main" or "flask"
 *   METAMASK_ENVIRONMENT: "production", "rc", "test", "e2e", "exp", "dev"
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const BUILDS_PATH = path.join(__dirname, '../.github/builds.yml');

// Environment variables to verify (env section of builds.yml)
const ENV_VARS_TO_VERIFY = [
  // Core build identity
  'METAMASK_ENVIRONMENT',
  'METAMASK_BUILD_TYPE',
  // Server URLs
  'PORTFOLIO_API_URL',
  'SECURITY_ALERTS_API_URL',
  'DECODING_API_URL',
  'AUTH_SERVICE_URL',
  'REWARDS_API_URL',
  'BAANX_API_URL',
  'RAMPS_ENVIRONMENT',
  // Build flags
  'BRIDGE_USE_DEV_APIS',
  'RAMP_INTERNAL_BUILD',
  'IS_TEST',
  // Test/E2E specific
  'IGNORE_BOXLOGS_DEVELOPMENT',
  'IS_SIM_BUILD',
  // Dev/Exp specific
  'MM_ENABLE_SETTINGS_PAGE_DEV_OPTIONS',
];

// Secret mappings to verify exist (secrets section of builds.yml)
// These are remapped by build.sh in Bitrise
const SECRETS_TO_VERIFY = [
  // Analytics (remapped per environment)
  'SEGMENT_WRITE_KEY',
  'SEGMENT_PROXY_URL',
  'SEGMENT_DELETE_API_SOURCE_ID',
  'SEGMENT_REGULATIONS_ENDPOINT',
  // Infrastructure
  'MM_SENTRY_DSN',
  'MM_SENTRY_AUTH_TOKEN',
  'MM_INFURA_PROJECT_ID',
  'WALLET_CONNECT_PROJECT_ID',
  // OAuth (remapped per environment)
  'IOS_GOOGLE_CLIENT_ID',
  'IOS_GOOGLE_REDIRECT_URI',
  'ANDROID_GOOGLE_CLIENT_ID',
  'ANDROID_APPLE_CLIENT_ID',
  'ANDROID_GOOGLE_SERVER_CLIENT_ID',
  // Card/Baanx
  'MM_CARD_BAANX_API_CLIENT_KEY',
  // Other critical secrets
  'MM_FOX_CODE',
  'MM_BRANCH_KEY_LIVE',
  'GOOGLE_SERVICES_B64_IOS',
  'GOOGLE_SERVICES_B64_ANDROID',
];

// Expected code fencing features per build type
const EXPECTED_CODE_FENCING = {
  main: [
    'preinstalled-snaps',
    'keyring-snaps',
    'multi-srp',
    'solana',
    'bitcoin',
    'tron',
  ],
  flask: [
    'flask',
    'preinstalled-snaps',
    'external-snaps',
    'keyring-snaps',
    'multi-srp',
    'solana',
    'bitcoin',
    'tron',
  ],
};

/**
 * Map old Bitrise environment names to builds.yml build names
 */
function getBuildName(buildType, environment) {
  // Normalize environment names
  const envMap = {
    production: 'prod',
    development: 'dev',
    // These stay the same: rc, test, e2e, exp, dev
  };

  const normalizedEnv = envMap[environment] || environment;
  return `${buildType}-${normalizedEnv}`;
}

/**
 * Load config from builds.yml
 */
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

/**
 * Compare current env vars with builds.yml config
 */
function verifyConfig(options = {}) {
  const { strict = false, verbose = false } = options;

  const buildType = process.env.METAMASK_BUILD_TYPE;
  const environment = process.env.METAMASK_ENVIRONMENT;

  if (!buildType || !environment) {
    console.error(
      '❌ METAMASK_BUILD_TYPE or METAMASK_ENVIRONMENT not set in environment',
    );
    console.error(
      '   This script should run AFTER Bitrise remapping sets these variables.',
    );
    return { success: false, mismatches: [], warnings: [] };
  }

  const buildName = getBuildName(buildType, environment);
  console.log(`\n🔍 Verifying builds.yml config for: ${buildName}`);
  console.log(`   METAMASK_BUILD_TYPE: ${buildType}`);
  console.log(`   METAMASK_ENVIRONMENT: ${environment}\n`);

  let config;
  try {
    config = loadConfig(buildName);
  } catch (error) {
    console.error(`❌ ${error.message}`);
    return { success: false, mismatches: [], warnings: [] };
  }

  const mismatches = [];
  const matches = [];
  const warnings = [];

  // Verify env vars
  console.log('📋 Checking environment variables...');
  ENV_VARS_TO_VERIFY.forEach((key) => {
    const currentValue = process.env[key];
    const configValue = config.env?.[key];

    if (configValue === undefined) {
      warnings.push({ key, reason: 'Not defined in builds.yml' });
      if (verbose) console.log(`   ⚠️  ${key}: Not in builds.yml`);
      return;
    }

    const configValueStr = String(configValue);

    if (currentValue === undefined) {
      warnings.push({ key, reason: 'Not set in current environment' });
      if (verbose)
        console.log(`   ⚠️  ${key}: Not in env (builds.yml: "${configValueStr}")`);
      return;
    }

    if (currentValue === configValueStr) {
      matches.push({ key, value: currentValue });
      if (verbose) console.log(`   ✅ ${key}: "${currentValue}"`);
    } else {
      mismatches.push({
        key,
        expected: configValueStr,
        actual: currentValue,
      });
      console.log(`   ❌ ${key}:`);
      console.log(`      Current:    "${currentValue}"`);
      console.log(`      builds.yml: "${configValueStr}"`);
    }
  });

  // Verify secrets exist in config (we can't compare actual values)
  console.log('\n🔐 Checking secret mappings...');
  SECRETS_TO_VERIFY.forEach((key) => {
    const secretMapping = config.secrets?.[key];

    if (secretMapping === undefined) {
      warnings.push({ key, reason: 'Secret not mapped in builds.yml' });
      console.log(`   ⚠️  ${key}: Not mapped in builds.yml secrets`);
    } else {
      matches.push({ key, mapping: secretMapping });
      if (verbose) console.log(`   ✅ ${key} → ${secretMapping}`);
    }
  });

  // Verify code fencing
  console.log('\n🏗️  Checking code fencing...');
  if (config.code_fencing) {
    const configFeatures = config.code_fencing;
    const expectedFeatures = EXPECTED_CODE_FENCING[buildType];

    if (expectedFeatures) {
      // Check if all expected features are present
      const missingFeatures = expectedFeatures.filter(
        (f) => !configFeatures.includes(f),
      );
      const extraFeatures = configFeatures.filter(
        (f) => !expectedFeatures.includes(f),
      );

      if (missingFeatures.length === 0 && extraFeatures.length === 0) {
        matches.push({ key: 'code_fencing', features: configFeatures });
        if (verbose) {
          console.log(`   ✅ Features: ${configFeatures.join(', ')}`);
        } else {
          console.log(
            `   ✅ ${configFeatures.length} features match expected for ${buildType}`,
          );
        }
      } else {
        if (missingFeatures.length > 0) {
          mismatches.push({
            key: 'code_fencing_missing',
            expected: missingFeatures.join(', '),
            actual: 'not present',
          });
          console.log(`   ❌ Missing features: ${missingFeatures.join(', ')}`);
        }
        if (extraFeatures.length > 0) {
          warnings.push({
            key: 'code_fencing_extra',
            reason: `Extra features: ${extraFeatures.join(', ')}`,
          });
          console.log(`   ⚠️  Extra features: ${extraFeatures.join(', ')}`);
        }
      }
    } else {
      warnings.push({
        key: 'code_fencing',
        reason: `Unknown build type: ${buildType}`,
      });
      console.log(`   ⚠️  Unknown build type "${buildType}" for code fencing check`);
      if (verbose) {
        console.log(`   Features: ${configFeatures.join(', ')}`);
      }
    }
  } else {
    mismatches.push({
      key: 'code_fencing',
      expected: 'defined',
      actual: 'undefined',
    });
    console.log(`   ❌ No code fencing defined in builds.yml`);
  }

  // Verify remote feature flags
  console.log('\n🚩 Checking remote feature flags...');
  if (config.remote_feature_flags) {
    const flags = Object.keys(config.remote_feature_flags);
    if (verbose) {
      Object.entries(config.remote_feature_flags).forEach(([flag, value]) => {
        console.log(`   ✅ ${flag}: ${value}`);
      });
    } else {
      console.log(`   ✅ ${flags.length} remote feature flags configured`);
    }
  } else {
    warnings.push({
      key: 'remote_feature_flags',
      reason: 'Not defined in builds.yml',
    });
    console.log(`   ⚠️  No remote feature flags defined`);
  }

  // Summary
  console.log('\n' + '─'.repeat(60));
  if (mismatches.length === 0) {
    console.log('✅ Config verification PASSED');
    console.log(`   ${matches.length} items matched`);
    if (warnings.length > 0) {
      console.log(`   ${warnings.length} warnings (non-critical)`);
    }
  } else {
    console.log('❌ Config verification FAILED');
    console.log(`   ${mismatches.length} mismatches found`);
    console.log(`   ${matches.length} items matched`);
    if (warnings.length > 0) {
      console.log(`   ${warnings.length} warnings`);
    }
  }
  console.log('─'.repeat(60) + '\n');

  const success = mismatches.length === 0;

  if (strict && !success) {
    console.error(
      '🛑 Strict mode: Exiting with error due to config mismatches',
    );
    console.error(
      '   Fix builds.yml to match current Bitrise configuration, or update Bitrise.',
    );
  }

  return { success, mismatches, warnings, matches };
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const strict = args.includes('--strict');
  const verbose = args.includes('--verbose');

  const result = verifyConfig({ strict, verbose });

  if (strict && !result.success) {
    process.exit(1);
  }
}

module.exports = { verifyConfig, getBuildName, loadConfig };
