#!/usr/bin/env node

/**
 * Generates environment variable assignments from config secrets mapping
 * Note: GitHub Actions doesn't allow dynamic secret access for security reasons.
 * This script outputs a shell script that can be sourced, but secrets must be
 * configured in the GitHub environment settings and accessed via ${{ secrets.SECRET_NAME }}
 */

function generateSecretEnvVars(configSecretsJson) {
  if (!configSecretsJson) {
    console.log('# No secrets mapping provided');
    return '';
  }

  try {
    const secretsMapping = JSON.parse(configSecretsJson);
    const lines = [];

    // Generate shell script that sets environment variables
    // Note: In actual GitHub Actions, secrets are accessed via ${{ secrets.SECRET_NAME }}
    // This script is for documentation/reference purposes
    Object.entries(secretsMapping).forEach(([envVarName, secretName]) => {
      // Output a comment showing the mapping
      lines.push(`# ${envVarName} -> ${secretName}`);
      // In GitHub Actions, this would be: export ${envVarName}="${{ secrets.${secretName} }}"
      lines.push(`export ${envVarName}="\${${secretName}}"`);
    });

    return lines.join('\n');
  } catch (error) {
    console.error('Error parsing secrets mapping:', error);
    process.exit(1);
  }
}

// CLI usage
if (require.main === module) {
  const configSecrets = process.argv[1] || process.env.CONFIG_SECRETS;
  if (!configSecrets) {
    console.error('Usage: node set-secrets-from-config.js <secrets_json>');
    console.error('Or set CONFIG_SECRETS environment variable');
    process.exit(1);
  }

  const output = generateSecretEnvVars(configSecrets);
  console.log(output);
}

module.exports = { generateSecretEnvVars };
