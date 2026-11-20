#!/usr/bin/env node
/**
 * Fails a workflow step when a GitHub secret it maps is missing or malformed,
 * so a secret nobody saved in a GitHub environment stops the build instead of
 * shipping as an empty string.
 *
 * The secrets checked are the step's own `env:` entries of the form
 * `NAME: ${{ secrets.SECRET }}`, read from the workflow file, so there is no
 * second list to keep in sync. Conditional mappings such as
 * `${{ cond && secrets.SECRET || '' }}` are skipped: they are empty on purpose
 * for some builds.
 *
 * A GitHub environment may leave a secret unset only when
 * .github/optional-secrets.yml lists it for that environment. A value that is
 * set is always checked, optional or not.
 *
 * Usage: node scripts/validate-step-secrets.js <workflow file> <step id>
 * Reads SECRETS_ENVIRONMENT (the job's GitHub environment) and the step's env.
 *
 * Never logs secret values or any substring of them.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { checkValue } = require('./lib/validate-value');

const OPTIONAL_SECRETS_PATH = path.resolve(
  __dirname,
  '../.github/optional-secrets.yml',
);
const PLAIN_SECRET_MAPPING = /^\$\{\{\s*secrets\.([A-Za-z0-9_]+)\s*\}\}$/;

/**
 * @param {object} workflow - Parsed workflow file.
 * @param {string} stepId - `id` of the step to read.
 * @returns {Record<string, string>} Env var name -> GitHub secret name.
 */
function findStepSecrets(workflow, stepId) {
  const steps = Object.values(workflow.jobs || {}).flatMap(
    (job) => job.steps || [],
  );
  const step = steps.find((candidate) => candidate.id === stepId);
  if (!step) {
    throw new Error(`No step with id "${stepId}" in the workflow.`);
  }
  const mapping = {};
  for (const [envVar, value] of Object.entries(step.env || {})) {
    const match = String(value).match(PLAIN_SECRET_MAPPING);
    if (match) {
      mapping[envVar] = match[1];
    }
  }
  return mapping;
}

/**
 * @param {object} options
 * @param {Record<string, string>} options.mapping - Env var name -> secret name.
 * @param {string} options.environment - GitHub environment of the job.
 * @param {Record<string, string[]>} options.optionalSecrets - Environment -> secrets it may leave unset.
 * @param {Record<string, string | undefined>} options.env - The step's process environment.
 * @returns {{ errors: string[], skipped: string[], unmapped: string[] }}
 */
function validateStepSecrets({ mapping, environment, optionalSecrets, env }) {
  const optional = new Set(optionalSecrets[environment] || []);
  const errors = [];
  const skipped = [];
  const unmapped = [];
  for (const [envVar, secretName] of Object.entries(mapping)) {
    const value = env[envVar];
    // The checkout can be another branch than the running workflow, so the file
    // may map a secret the running step does not. GitHub Actions passes a
    // mapped secret that is not set as an empty string, never as undefined.
    if (value === undefined) {
      unmapped.push(secretName);
      continue;
    }
    if (value === '') {
      if (optional.has(secretName)) {
        skipped.push(secretName);
      } else {
        errors.push(
          `${secretName}: not set in the ${environment || 'job'} GitHub environment (mapped to ${envVar})`,
        );
      }
      continue;
    }
    for (const issue of checkValue(secretName, value)) {
      errors.push(`${issue.message} (mapped to ${envVar})`);
    }
  }
  return { errors, skipped, unmapped };
}

function main() {
  const [workflowPath, stepId] = process.argv.slice(2);
  if (!workflowPath || !stepId) {
    console.error(
      'Usage: node scripts/validate-step-secrets.js <workflow file> <step id>',
    );
    process.exit(1);
  }
  const environment = process.env.SECRETS_ENVIRONMENT || '';
  const mapping = findStepSecrets(
    yaml.load(fs.readFileSync(workflowPath, 'utf8')),
    stepId,
  );
  const optionalSecrets =
    yaml.load(fs.readFileSync(OPTIONAL_SECRETS_PATH, 'utf8')) || {};

  const { errors, skipped, unmapped } = validateStepSecrets({
    mapping,
    environment,
    optionalSecrets,
    env: process.env,
  });

  if (unmapped.length > 0) {
    console.log(
      `Not mapped by the running workflow, not checked: ${unmapped.join(', ')}`,
    );
  }
  if (skipped.length > 0) {
    console.log(`Not set, optional in ${environment}: ${skipped.join(', ')}`);
  }
  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`::error title=Missing or malformed secret::${error}`);
    }
    console.error(
      `Save the secret in the ${environment || 'job'} GitHub environment, or list it for that environment in .github/optional-secrets.yml if the build does not need it.`,
    );
    process.exit(1);
  }
  console.log(
    `All ${Object.keys(mapping).length - skipped.length - unmapped.length} mapped secret(s) are set and well-formed.`,
  );
}

if (require.main === module) {
  main();
}

module.exports = { findStepSecrets, validateStepSecrets };
