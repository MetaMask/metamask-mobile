#!/usr/bin/env node
/**
 * Maintenance script: regenerates the "Set secrets" step env block in
 * .github/workflows/build.yml from .github/builds.yml.
 *
 * Runs at edit time (on your machine), NOT during workflow execution.
 * GitHub Actions requires each secret to be explicitly referenced in the
 * workflow YAML (e.g. SECRET_NAME: ${{ secrets.SECRET_NAME }}); it cannot
 * dynamically inject secrets from a list. So the workflow file must contain
 * that list. This script keeps it in sync with builds.yml (single source of
 * truth) so you don't maintain it by hand.
 *
 * Contrast: apply-build-config.js runs at workflow runtime and exports
 * non-secret config (env, code_fencing, remote_feature_flags). It does not
 * deal with secrets.
 *
 * Run after adding/removing/renaming secrets in builds.yml:
 *   yarn build:workflow:update-secrets
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const BUILDS_PATH = path.join(__dirname, '../.github/builds.yml');
const WORKFLOW_PATH = path.join(__dirname, '../.github/workflows/build.yml');

function getAllSecretNames() {
  const config = yaml.load(fs.readFileSync(BUILDS_PATH, 'utf8'));
  if (!config.builds) {
    throw new Error('.github/builds.yml has no builds');
  }
  const names = new Set();
  for (const build of Object.values(config.builds)) {
    if (build.secrets && typeof build.secrets === 'object') {
      for (const secretName of Object.values(build.secrets)) {
        names.add(secretName);
      }
    }
  }
  return [...names].sort();
}

function generateEnvBlock(secretNames) {
  const lines = [
    '          CONFIG_SECRETS: ${{ needs.prepare.outputs.secrets_json }}',
    '          # Injected from builds.yml (run scripts/generate-build-workflow-secrets-env.js after changing secrets)',
    ...secretNames.map(
    (name) => '          ' + name + ': ${{ secrets.' + name + ' }}',
  ),
  ];
  return lines.join('\n');
}

function updateWorkflow(envBlock) {
  let content = fs.readFileSync(WORKFLOW_PATH, 'utf8');
  const startMarker = '      - name: Set secrets\n        env:';
  const endMarker = '\n        run: node scripts/set-secrets-from-config.js';
  const startIdx = content.indexOf(startMarker);
  const endIdx = content.indexOf(endMarker, startIdx);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error('Could not find "Set secrets" step in build.yml');
  }
  const before = content.slice(0, startIdx + startMarker.length);
  const after = content.slice(endIdx);
  content = before + '\n' + envBlock + after;
  fs.writeFileSync(WORKFLOW_PATH, content, 'utf8');
}

function main() {
  const secretNames = getAllSecretNames();
  console.log(`Found ${secretNames.length} unique secret names from builds.yml`);
  const envBlock = generateEnvBlock(secretNames);
  updateWorkflow(envBlock);
  console.log('Updated .github/workflows/build.yml');
}

main();
