#!/usr/bin/env node
/**
 * Maps shared-engine smart-e2e result_json onto existing Smart E2E
 * GitHub Action outputs. Analysis and PR comments are owned by
 * MetaMask/ai-analyzer (mode.yaml comment policy + post-results).
 */

import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { mapSmartE2eOutputs, parseResultJson } from './map-smart-e2e-outputs.mjs';

const env = {
  GITHUB_OUTPUT: process.env.GITHUB_OUTPUT || '',
  RESULT_JSON: process.env.RESULT_JSON || '',
  WORKSPACE: process.env.GITHUB_WORKSPACE || process.cwd(),
};

const RESULT_FILE = 'smart-e2e.json';

function setGithubOutputs(key, value) {
  if (!env.GITHUB_OUTPUT) return;

  if (typeof value === 'string' && value.includes('\n')) {
    appendFileSync(env.GITHUB_OUTPUT, `${key}<<EOF\n${value}\nEOF\n`);
  } else {
    appendFileSync(env.GITHUB_OUTPUT, `${key}=${value}\n`);
  }
}

function applyMappedOutputs(mapped) {
  setGithubOutputs('ai_e2e_test_tags', mapped.ai_e2e_test_tags);
  setGithubOutputs('ai_confidence', mapped.ai_confidence);
  setGithubOutputs('ai_performance_test_tags', mapped.ai_performance_test_tags);
  setGithubOutputs(
    'ai_performance_test_reasoning',
    mapped.ai_performance_test_reasoning,
  );
}

function loadResult() {
  const fromEnv = parseResultJson(env.RESULT_JSON);
  if (fromEnv) {
    return fromEnv;
  }

  const resultPath = join(env.WORKSPACE, RESULT_FILE);
  if (!existsSync(resultPath)) {
    return null;
  }

  try {
    return parseResultJson(readFileSync(resultPath, 'utf8'));
  } catch (error) {
    console.error(`❌ Failed to read ${RESULT_FILE}`);
    console.error(`Error: ${error.message}`);
    return null;
  }
}

const parsedResult = loadResult();
if (!parsedResult) {
  console.error(
    '❌ No smart-e2e result_json or smart-e2e.json; using conservative fallback',
  );
}

applyMappedOutputs(mapSmartE2eOutputs(parsedResult));
