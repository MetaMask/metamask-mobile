#!/usr/bin/env node

/**
 * Loads YAML configuration using anchors
 * Since YAML anchors require the shared.yml to be included,
 * this script loads both shared.yml and the environment config
 * and merges them properly
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function loadConfigWithAnchors(environment) {
  const sharedPath = path.join(__dirname, '../build/environments/shared.yml');
  const envPath = path.join(__dirname, `../build/environments/${environment}/config.yml`);

  // Load shared.yml first to get anchors
  const sharedContent = fs.readFileSync(sharedPath, 'utf8');
  const sharedDoc = yaml.load(sharedContent, { schema: yaml.DEFAULT_SCHEMA });

  // Load environment config (which references anchors from shared.yml)
  // We need to include shared.yml content so anchors are available
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  // Combine shared and env content, then parse
  // Note: This is a simplified approach. In practice, you'd need a YAML processor
  // that supports cross-file anchors, or merge the parsed objects
  const combinedContent = sharedContent + '\n---\n' + envContent;
  
  try {
    // Load with all documents
    const docs = yaml.loadAll(combinedContent);
    
    // The first doc is shared.yml, second is env config
    // Merge them (env config takes precedence)
    const shared = docs[0] || {};
    const env = docs[1] || {};
    
    // Deep merge
    const merged = deepMerge(shared, env);
    
    return merged;
  } catch (error) {
    // Fallback: load separately and merge manually
    const envDoc = yaml.load(envContent);
    
    // Manually resolve anchor references
    const resolved = resolveAnchors(sharedDoc, envDoc);
    
    return resolved;
  }
}

function deepMerge(base, override) {
  const result = { ...base };

  for (const key in override) {
    if (override[key] && typeof override[key] === 'object' && !Array.isArray(override[key])) {
      if (key === '<<') {
        // Handle merge key
        const mergeSource = override[key];
        Object.assign(result, mergeSource);
      } else {
        result[key] = deepMerge(base[key] || {}, override[key]);
      }
    } else {
      result[key] = override[key];
    }
  }

  return result;
}

function resolveAnchors(shared, env) {
  // Extract anchors from shared (keys starting with x-)
  const anchors = {};
  Object.keys(shared).forEach(key => {
    if (key.startsWith('x-')) {
      const anchorName = key.substring(2); // Remove 'x-' prefix
      anchors[anchorName] = shared[key];
    }
  });

  // Resolve anchor references in env config
  const resolved = JSON.parse(JSON.stringify(env)); // Deep clone

  // Replace anchor references (*anchorName) with actual values
  function resolveValue(value) {
    if (typeof value === 'string' && value.startsWith('*')) {
      const anchorName = value.substring(1);
      return anchors[anchorName] || value;
    }
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        return value.map(resolveValue);
      }
      const resolvedObj = {};
      Object.keys(value).forEach(key => {
        if (key === '<<') {
          // Handle merge key
          const mergeSource = resolveValue(value[key]);
          Object.assign(resolvedObj, mergeSource);
        } else {
          resolvedObj[key] = resolveValue(value[key]);
        }
      });
      return resolvedObj;
    }
    return value;
  }

  return resolveValue(resolved);
}

// CLI usage
if (require.main === module) {
  const environment = process.argv[2];
  if (!environment) {
    console.error('Usage: node load-yaml-config.js <environment>');
    process.exit(1);
  }

  const config = loadConfigWithAnchors(environment);
  console.log(JSON.stringify(config, null, 2));
}

module.exports = { loadConfigWithAnchors };
