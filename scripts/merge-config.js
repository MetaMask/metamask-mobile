#!/usr/bin/env node

/**
 * Merges configuration files in hierarchical order:
 * 1. base.yml (universal)
 * 2. build-types/{buildType}.yml (build type specific)
 * 3. environments/{environment}.yml (environment specific)
 * 4. combinations/{buildType}-{environment}.yml (combination specific)
 *
 * Later configs override earlier ones
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function deepMerge(base, override) {
  if (!override) return base;
  if (!base) return override;

  const result = { ...base };

  for (const key in override) {
    if (override[key] && typeof override[key] === 'object' && !Array.isArray(override[key])) {
      result[key] = deepMerge(base[key] || {}, override[key]);
    } else {
      result[key] = override[key];
    }
  }

  return result;
}

function loadYaml(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  return yaml.load(fs.readFileSync(filePath, 'utf8'));
}

function resolveCodeFencingFeatures(config, buildType, environment) {
  // Resolve code fencing active features based on config
  if (!config.code_fencing) return config;

  const codeFencing = config.code_fencing;
  const activeFeaturesKey = codeFencing.active_features;

  if (activeFeaturesKey && typeof activeFeaturesKey === 'string' && codeFencing[activeFeaturesKey]) {
    // Replace active_features string with actual array
    codeFencing.active_features = codeFencing[activeFeaturesKey];
  }

  // Add sample-feature if enabled
  if (process.env.INCLUDE_SAMPLE_FEATURE === 'true') {
    if (!codeFencing.active_features) {
      codeFencing.active_features = [];
    }
    if (!codeFencing.active_features.includes('sample-feature')) {
      codeFencing.active_features.push('sample-feature');
    }
  }

  return config;
}

function mergeConfigs(buildType, environment) {
  const baseDir = path.join(__dirname, '../build/environments');

  // Load in hierarchical order
  const base = loadYaml(path.join(baseDir, 'base.yml')) || {};
  const buildTypeConfig = loadYaml(path.join(baseDir, `build-types/${buildType}.yml`)) || {};
  const envConfig = loadYaml(path.join(baseDir, `environments/${environment}.yml`)) || {};
  const combinationConfig = loadYaml(path.join(baseDir, `combinations/${buildType}-${environment}.yml`)) || {};

  // Merge in order: base -> buildType -> environment -> combination
  let merged = deepMerge({}, base);
  merged = deepMerge(merged, buildTypeConfig);
  merged = deepMerge(merged, envConfig);
  merged = deepMerge(merged, combinationConfig);

  // Merge common_secrets with environment/combination secrets
  if (base.common_secrets) {
    merged.secrets = { ...base.common_secrets, ...(merged.secrets || {}) };
  }

  // Remove common_secrets from final output (it's been merged)
  delete merged.common_secrets;

  // Resolve code fencing features
  merged = resolveCodeFencingFeatures(merged, buildType, environment);

  return merged;
}

// CLI usage
if (require.main === module) {
  const buildType = process.argv[2];
  const environment = process.argv[3];

  if (!buildType || !environment) {
    console.error('Usage: node merge-config.js <buildType> <environment>');
    console.error('Example: node merge-config.js main prod');
    process.exit(1);
  }

  try {
    const merged = mergeConfigs(buildType, environment);
    console.log(JSON.stringify(merged, null, 2));
  } catch (error) {
    console.error('Error merging configs:', error.message);
    process.exit(1);
  }
}

module.exports = { mergeConfigs };
