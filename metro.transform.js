/* eslint-disable no-console */
/* eslint-disable import/no-nodejs-modules */
/* eslint-disable import/no-commonjs */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const {
  removeFencedCode,
  lintTransformedFile,
} = require('@metamask/build-utils');
const { ESLint } = require('eslint');
const defaultTransformer = require('metro-react-native-babel-transformer');
const svgTransformer = require('react-native-svg-transformer');

// Code fence removal variables
const fileExtsToScan = ['.js', '.jsx', '.cjs', '.mjs', '.ts', '.tsx'];

// All available features that can be used in code fences
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

// Legacy (main) hardcoded feature sets — used when CODE_FENCING_FEATURES is not set (e.g. Bitrise / local)
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
const experimentalFeatureSet = new Set([...mainFeatureSet, 'experimental']);

/** Cached code_fencing from builds.yml when CODE_FENCING_FEATURES is unset (local/Bitrise). Avoids re-reading file on every transform. */
let codeFencingFromBuildsYmlCache = null;

/**
 * Computes build name (e.g. main-prod, flask-dev) from METAMASK_BUILD_TYPE + METAMASK_ENVIRONMENT.
 * Matches keys in builds.yml so we can look up code_fencing.
 *
 * @returns {string|null} Build name or null if env vars are missing/invalid.
 */
function getBuildNameFromEnv() {
  const buildType = (process.env.METAMASK_BUILD_TYPE ?? 'main').toLowerCase();
  const env = (process.env.METAMASK_ENVIRONMENT ?? 'production').toLowerCase();
  const envPart = env === 'production' ? 'prod' : env;
  if (!buildType || !envPart) return null;
  return `${buildType}-${envPart}`;
}

/**
 * Loads code_fencing for the current build from builds.yml (single source of truth).
 * Used when CODE_FENCING_FEATURES is not set (local or Bitrise). Returns null on any error so we can fall back to hardcoded sets.
 *
 * @returns {string[]|null} Code fencing feature array or null.
 */
function loadCodeFencingFromBuildsYml() {
  if (codeFencingFromBuildsYmlCache !== null) {
    return codeFencingFromBuildsYmlCache;
  }
  try {
    const buildName = getBuildNameFromEnv();
    if (!buildName) {
      codeFencingFromBuildsYmlCache = null;
      return null;
    }
    const buildsPath = path.join(__dirname, 'builds.yml');
    if (!fs.existsSync(buildsPath)) {
      codeFencingFromBuildsYmlCache = null;
      return null;
    }
    const config = yaml.load(fs.readFileSync(buildsPath, 'utf8'));
    const build = config?.builds?.[buildName];
    const codeFencing = build?.code_fencing ?? null;
    codeFencingFromBuildsYmlCache = codeFencing;
    return codeFencing;
  } catch {
    codeFencingFromBuildsYmlCache = null;
    return null;
  }
}

/**
 * Gets features from METAMASK_BUILD_TYPE + METAMASK_ENVIRONMENT (main branch logic).
 * Used when CODE_FENCING_FEATURES is not set and builds.yml lookup failed or was skipped (Bitrise / local fallback).
 *
 * @returns {Set<string>} The set of features to be included in the build.
 */
function getBuildTypeFeaturesFromEnv() {
  const buildType = process.env.METAMASK_BUILD_TYPE ?? 'main';
  const envType = process.env.METAMASK_ENVIRONMENT ?? 'production';
  let features;

  switch (buildType) {
    case 'qa':
    case 'QA':
    case 'main':
      if (envType === 'exp') {
        features = new Set(experimentalFeatureSet);
        break;
      }
      features =
        envType === 'beta' ? new Set(betaFeatureSet) : new Set(mainFeatureSet);
      break;
    case 'beta':
      features = new Set(betaFeatureSet);
      break;
    case 'flask':
      features = new Set(flaskFeatureSet);
      break;
    default:
      throw new Error(
        `Invalid METAMASK_BUILD_TYPE of ${buildType} was passed to metro transform`,
      );
  }

  return features;
}

/**
 * Gets the features for the current build type, used to determine which code
 * fences to remove.
 *
 * 1. GH Actions: CODE_FENCING_FEATURES from env (set by apply-build-config.js from builds.yml).
 * 2. Local / Bitrise: try builds.yml by build name (METAMASK_BUILD_TYPE + METAMASK_ENVIRONMENT).
 * 3. Fallback: hardcoded sets (getBuildTypeFeaturesFromEnv) if builds.yml missing or build not found.
 *
 * @returns {Set<string>} The set of features to be included in the build.
 */
function getBuildTypeFeatures() {
  // 1. GH Actions: single source of truth from builds.yml (already in env)
  if (process.env.CODE_FENCING_FEATURES) {
    const features = JSON.parse(process.env.CODE_FENCING_FEATURES);
    const featureSet = new Set(features);
    if (process.env.INCLUDE_SAMPLE_FEATURE === 'true') {
      featureSet.add('sample-feature');
    }
    return featureSet;
  }

  // 2. Local / Bitrise: load code_fencing from builds.yml when env is set
  const codeFencing = loadCodeFencingFromBuildsYml();
  if (Array.isArray(codeFencing) && codeFencing.length > 0) {
    const featureSet = new Set(codeFencing);
    if (process.env.INCLUDE_SAMPLE_FEATURE === 'true') {
      featureSet.add('sample-feature');
    }
    return featureSet;
  }

  // 3. Fallback: hardcoded sets (e.g. builds.yml missing or build name not found)
  const featureSet = getBuildTypeFeaturesFromEnv();
  if (process.env.INCLUDE_SAMPLE_FEATURE === 'true') {
    featureSet.add('sample-feature');
  }
  return featureSet;
}

/**
 * The Metro transformer function. Notably, handles code fence removal.
 * See https://github.com/MetaMask/core/tree/main/packages/build-utils for details.
 */
module.exports.transform = async ({ src, filename, options }) => {
  if (filename.endsWith('.svg')) {
    return svgTransformer.transform({ src, filename, options });
  }

  const environment = process.env.METAMASK_ENVIRONMENT ?? 'production';
  const shouldLintFencedFiles = environment === 'production';

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

    if (shouldLintFencedFiles && didModify) {
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
