/* eslint-disable no-console */
/* eslint-disable import/no-nodejs-modules */
/* eslint-disable import/no-commonjs */
const path = require('path');
const {
  removeFencedCode,
  lintTransformedFile,
} = require('@metamask/build-utils');
const { ESLint } = require('eslint');
const defaultTransformer = require('metro-react-native-babel-transformer');
const svgTransformer = require('react-native-svg-transformer');

// Code fence removal variables
const fileExtsToScan = ['.js', '.jsx', '.cjs', '.mjs', '.ts', '.tsx'];
const availableFeatures = new Set([
  'flask',
  'preinstalled-snaps',
  'external-snaps',
  'beta',
  'keyring-snaps',
  'multi-srp',
  'bitcoin',
  'solana',
  'sample-feature',
  'tron',
  'experimental',
]);

const mainFeatureSet = new Set([
  'preinstalled-snaps',
  'keyring-snaps',
  'multi-srp',
  'solana',
  'bitcoin',
  'tron',
]);
const betaFeatureSet = new Set([
  'beta',
  'preinstalled-snaps',
  'keyring-snaps',
  'multi-srp',
  'solana',
  'bitcoin',
  'tron',
]);
const flaskFeatureSet = new Set([
  'flask',
  'preinstalled-snaps',
  'external-snaps',
  'keyring-snaps',
  'multi-srp',
  'bitcoin',
  'solana',
  'tron',
]);
// Experimental feature set includes all main features plus experimental
const experimentalFeatureSet = new Set([...mainFeatureSet, 'experimental']);

/**
 * Gets the features for the current build type from config
 * Falls back to hardcoded logic if config not available
 *
 * @returns {Set<string>} The set of features to be included in the build.
 */
function getBuildTypeFeatures() {
  const buildType = process.env.METAMASK_BUILD_TYPE ?? 'main';
  const envType = process.env.METAMASK_ENVIRONMENT ?? 'production';

  // Try to load from config first
  try {
    const { mergeConfigs } = require('./scripts/merge-config.js');
    const config = mergeConfigs(buildType, envType);

    if (config.code_fencing?.active_features) {
      return new Set(config.code_fencing.active_features);
    }
  } catch (error) {
    // Fallback to hardcoded logic if config loading fails
    console.warn('Failed to load config, using fallback logic:', error.message);
  }

  // Fallback to original hardcoded logic
  let features;
  switch (buildType) {
    // TODO: Remove uppercase QA once we've consolidated build types
    case 'qa':
    case 'QA':
    case 'main':
      // TODO: Refactor this once we've abstracted environment away from build type
      if (envType === 'exp') {
        // Only include experimental features in experimental environment
        features = experimentalFeatureSet;
        break;
      }
      features = envType === 'beta' ? betaFeatureSet : mainFeatureSet;
      break;
    case 'beta':
      features = betaFeatureSet;
      break;
    case 'flask':
      features = flaskFeatureSet;
      break;
    default:
      throw new Error(
        `Invalid METAMASK_BUILD_TYPE of ${buildType} was passed to metro transform`,
      );
  }

  // Add sample-feature only if explicitly enabled via env var
  if (process.env.INCLUDE_SAMPLE_FEATURE === 'true') {
    features.add('sample-feature');
  }

  return features;
}

/**
 * The Metro transformer function. Notably, handles code fence removal.
 * See https://github.com/MetaMask/core/tree/main/packages/build-utils for details.
 */
module.exports.transform = async ({ src, filename, options }) => {
  if (filename.endsWith('.svg')) {
    return svgTransformer.transform({ src, filename, options });
  }

  /**
   * Params based on builds we're code splitting
   * i.e: flavorDimensions "version" productFlavors from android/app/build.gradle
   */
  if (
    !path.normalize(filename).split(path.sep).includes('node_modules') &&
    fileExtsToScan.includes(path.extname(filename))
  ) {
    const [processedSource, didModify] = removeFencedCode(filename, src, {
      all: availableFeatures,
      active: getBuildTypeFeatures(),
    });

    if (didModify) {
      await lintTransformedFile(getESLintInstance(), filename, processedSource);
    }
    return defaultTransformer.transform({
      src: processedSource,
      filename,
      options,
    });
  }
  return defaultTransformer.transform({ src, filename, options });
};

/**
 * The singleton ESLint instance.
 *
 * @type {ESLint}
 */
let eslintInstance;

/**
 * Gets the singleton ESLint instance, initializing it if necessary.
 * Initializing involves reading the ESLint configuration from disk and
 * modifying it according to the needs of code fence removal.
 *
 * @returns {ESLint} The singleton ESLint instance.
 */
function getESLintInstance() {
  if (!eslintInstance) {
    const eslintrc = require('./.eslintrc.js');

    eslintrc.overrides.forEach((override) => {
      const rules = override.rules ?? {};

      // We don't want linting to fail for purely stylistic reasons.
      rules['prettier/prettier'] = 'off';
      // Sometimes we use `let` instead of `const` to assign variables depending on
      // the build type.
      rules['prefer-const'] = 'off';

      override.rules = rules;
    });

    // also override the rules section
    // We don't want linting to fail for purely stylistic reasons.
    eslintrc.rules['prettier/prettier'] = 0;
    // Sometimes we use `let` instead of `const` to assign variables depending on
    // the build type.
    eslintrc.rules['prefer-const'] = 0;

    // Remove all test-related overrides. We will never lint test files here.
    eslintrc.overrides = eslintrc.overrides.filter(
      (override) =>
        !(
          (override.extends &&
            override.extends.find(
              (configName) =>
                configName.includes('jest') || configName.includes('mocha'),
            )) ||
          (override.plugins &&
            override.plugins.find((pluginName) => pluginName.includes('jest')))
        ),
    );

    eslintInstance = new ESLint({ baseConfig: eslintrc, useEslintrc: false });
  }
  return eslintInstance;
}
