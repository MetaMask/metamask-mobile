#!/usr/bin/env node

/**
 * MVP: Merges base.yml with environment-specific config.yml
 * Deep merges objects, with env config taking precedence
 *
 * Usage: node merge-config.js <environment>
 * Example: node merge-config.js prod
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function deepMerge(base, override) {
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

function mergeConfigs(environment) {
  const basePath = path.join(__dirname, '../build/environments/base.yml');
  const envPath = path.join(__dirname, `../build/environments/${environment}/config.yml`);

  if (!fs.existsSync(basePath)) {
    throw new Error(`Base config not found: ${basePath}`);
  }

  if (!fs.existsSync(envPath)) {
    throw new Error(`Environment config not found: ${envPath}`);
  }

  const baseConfig = yaml.load(fs.readFileSync(basePath, 'utf8'));
  const envConfig = yaml.load(fs.readFileSync(envPath, 'utf8'));

  // Merge base and environment configs
  const merged = deepMerge(baseConfig, envConfig);

  // Merge common_secrets with environment-specific secrets
  if (baseConfig.common_secrets && envConfig.secrets) {
    merged.secrets = { ...baseConfig.common_secrets, ...envConfig.secrets };
  } else if (baseConfig.common_secrets) {
    merged.secrets = baseConfig.common_secrets;
  }

  // Remove common_secrets from final output (it's been merged into secrets)
  delete merged.common_secrets;

  return merged;
}

// CLI usage
if (require.main === module) {
  const environment = process.argv[2];
  if (!environment) {
    console.error('Usage: node merge-config.js <environment>');
    console.error('Example: node merge-config.js prod');
    process.exit(1);
  }

  try {
    const merged = mergeConfigs(environment);
    console.log(JSON.stringify(merged, null, 2));
  } catch (error) {
    console.error('Error merging configs:', error.message);
    process.exit(1);
  }
}

module.exports = { mergeConfigs };
