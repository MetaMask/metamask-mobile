#!/usr/bin/env node
/**
 * Environment Variable Validation Script
 * 
 * This script validates that all environment variables defined in .js.env.example
 * are also present in the .js.env file. This ensures that developers don't miss
 * any required environment variables when setting up their local development environment.
 * 
 * Usage:
 *   - Run automatically during `yarn setup`
 *   - Run manually with `yarn validate:env` or `node scripts/validate-env.mjs`
 * 
 * The script will:
 *   - Parse both .js.env.example and .js.env files
 *   - Extract all export statements (format: export VAR_NAME="value")
 *   - Compare variable names and report any missing variables
 *   - Exit with code 0 if all variables are present, 1 if any are missing
 */
/* eslint-disable import/no-nodejs-modules */
import fs from 'fs';
import path from 'path';

/**
 * Parse environment file and extract variable names
 * @param {string} filePath - Path to the env file
 * @returns {Set<string>} Set of environment variable names
 */
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return new Set();
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const envVars = new Set();
  
  // Split into lines and process each line
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }
    
    // Match export statements like: export VAR_NAME="value"
    const exportMatch = trimmedLine.match(/^export\s+([A-Z_][A-Z0-9_]*)\s*=/);
    if (exportMatch) {
      envVars.add(exportMatch[1]);
    }
  }
  
  return envVars;
}

/**
 * Validate that all environment variables from the example file exist in the actual env file
 * @param {string} examplePath - Path to the .env.example file
 * @param {string} actualPath - Path to the actual .env file
 * @returns {Object} Validation result with missing variables and status
 */
export function validateEnvVars(examplePath, actualPath) {
  const exampleVars = parseEnvFile(examplePath);
  const actualVars = parseEnvFile(actualPath);
  
  // Find missing variables
  const missingVars = new Set([...exampleVars].filter(varName => !actualVars.has(varName)));
  
  return {
    isValid: missingVars.size === 0,
    missingVars: Array.from(missingVars),
    totalExampleVars: exampleVars.size,
    totalActualVars: actualVars.size,
  };
}

/**
 * Main function to validate environment variables
 * @param {boolean} throwOnError - Whether to throw an error if validation fails
 * @returns {Object} Validation result
 */
export function validateMainEnvVars(throwOnError = false) {
  const examplePath = '.js.env.example';
  const actualPath = '.js.env';
  
  const result = validateEnvVars(examplePath, actualPath);
  
  if (!result.isValid) {
    const errorMessage = [
      `❌ Environment validation failed!`,
      `Missing ${result.missingVars.length} environment variables in .js.env:`,
      ...result.missingVars.map(varName => `  - ${varName}`),
      '',
      'Please ensure your .js.env file contains all variables from .js.env.example',
      'You can copy missing variables from .js.env.example and set appropriate values.',
    ].join('\n');
    
    if (throwOnError) {
      throw new Error(errorMessage);
    } else {
      console.error(errorMessage);
    }
  } else {
    console.log(`✅ Environment validation passed! All ${result.totalExampleVars} variables present in .js.env`);
  }
  
  return result;
}

// If this script is run directly (not imported), validate the main env files
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = validateMainEnvVars(true);
    process.exit(result.isValid ? 0 : 1);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
} 