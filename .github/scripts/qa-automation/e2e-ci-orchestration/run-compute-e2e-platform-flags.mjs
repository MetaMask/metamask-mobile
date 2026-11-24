#!/usr/bin/env node
/**
 * GitHub Actions entrypoint for compute-e2e-platform-flags.mjs.
 */

import { appendFileSync } from 'node:fs';
import {
  classifyE2EChanges,
  resolveE2EPlatformRequirements,
} from './compute-e2e-platform-flags.mjs';

function readBool(value) {
  return value === 'true';
}

function readInt(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

const githubOutputPath = process.env.GITHUB_OUTPUT;
if (!githubOutputPath) {
  console.error('GITHUB_OUTPUT is not set');
  process.exit(1);
}

const allChangesCount = readInt(process.env.ALL_CHANGES_COUNT);
const e2eIgnorableCount = readInt(process.env.E2E_IGNORABLE_COUNT);
const e2eTestFilesCount = readInt(process.env.E2E_TEST_FILES_COUNT);
const e2eTestOrIgnorableCount = readInt(
  process.env.E2E_TEST_OR_IGNORABLE_COUNT,
);
const e2eWorkflowsCount = readInt(process.env.E2E_WORKFLOWS_COUNT);
const e2eSmokeInfraCount = readInt(process.env.E2E_SMOKE_INFRA_COUNT);

const { ignorableOnly, testOnlyChanges } = classifyE2EChanges({
  allChangesCount,
  e2eIgnorableCount,
  e2eTestFilesCount,
  e2eTestOrIgnorableCount,
  e2eWorkflowsCount,
});

const skipSmartSelection = readBool(process.env.SKIP_SMART_SELECTION);
const githubRefName =
  process.env.CI_REF_NAME || process.env.GITHUB_REF_NAME || '';

const labelOverrideInput = {
  runAppiumIosLabel: readBool(process.env.RUN_APPIUM_IOS_LABEL),
  githubEventName: process.env.GITHUB_EVENT_NAME || '',
  prBaseRef: process.env.PR_BASE_REF || '',
  isFork: readBool(process.env.IS_FORK),
  shouldSkipE2E: readBool(process.env.SHOULD_SKIP_E2E),
  ignorableOnly,
  testOnlyChanges,
};

const flags = resolveE2EPlatformRequirements({
  pathFilterInput: {
    githubEventName: process.env.GITHUB_EVENT_NAME || '',
    githubRefName,
    prBaseRef: process.env.PR_BASE_REF || '',
    isFork: readBool(process.env.IS_FORK),
    shouldSkipE2E: readBool(process.env.SHOULD_SKIP_E2E),
    allChangesCount,
    e2eIgnorableCount,
    e2eTestFilesCount,
    e2eTestOrIgnorableCount,
    e2eWorkflowsCount,
    androidCount: readInt(process.env.ANDROID_COUNT),
    iosCount: readInt(process.env.IOS_COUNT),
    androidOrIgnorableCount: readInt(process.env.ANDROID_OR_IGNORABLE_COUNT),
    iosOrIgnorableCount: readInt(process.env.IOS_OR_IGNORABLE_COUNT),
    changedSpecFiles: process.env.CHANGED_SPEC_FILES || '',
    addedSmokeSpecFiles: process.env.ADDED_SMOKE_SPEC_FILES || '',
  },
  labelOverrideInput,
  skipSmartSelection,
  e2eSmokeInfraCount,
});

let blockMerge = false;
if (readBool(process.env.LABEL_BLOCKS_MERGE) && !ignorableOnly) {
  blockMerge = true;
} else if (readBool(process.env.LABEL_BLOCKS_MERGE) && ignorableOnly) {
  console.log(
    '-> BLOCK_MERGE bypassed — ignorable-only changes',
  );
}

const PERFORMANCE_AREA_LABELS = {
  'run-performance-account-list-tests': '@PerformanceAccountList',
  'run-performance-onboarding-tests': '@PerformanceOnboarding',
  'run-performance-login-tests': '@PerformanceLogin',
  'run-performance-swaps-tests': '@PerformanceSwaps',
  'run-performance-launch-tests': '@PerformanceLaunch',
  'run-performance-asset-loading-tests': '@PerformanceAssetLoading',
  'run-performance-predict-tests': '@PerformancePredict',
  'run-performance-perps-tests': '@PerformancePreps',
  'run-performance-money-tests': '@PerformanceMoney',
  'run-performance-rewards-tests': '@PerformanceRewards',
};

/**
 * PR performance selection. The general label runs every test. Area labels
 * run the union of their tags. Forks and stable-base PRs run none.
 * @returns {string[]}
 */
function selectedPerformanceTags() {
  const allowed =
    process.env.GITHUB_EVENT_NAME === 'pull_request' &&
    process.env.PR_BASE_REF !== 'stable' &&
    !readBool(process.env.IS_FORK);
  if (!allowed) {
    return [];
  }
  if (readBool(process.env.RUN_PERFORMANCE_LABEL)) {
    return ['ALL'];
  }

  const labels = (process.env.PERFORMANCE_AREA_LABELS || '')
    .split(',')
    .map((label) => label.trim())
    .filter(Boolean);
  const tags = [];
  for (const label of labels) {
    const tag = PERFORMANCE_AREA_LABELS[label];
    if (tag && !tags.includes(tag)) {
      tags.push(tag);
    }
  }
  return tags;
}

const performanceTags = selectedPerformanceTags();
const runPerformance = performanceTags.length > 0;
let performanceTagsReasoning = '';
if (performanceTags[0] === 'ALL') {
  performanceTagsReasoning = 'Run via run-performance-tests label on PR';
} else if (performanceTags.length > 0) {
  performanceTagsReasoning = `Run via performance area labels: ${performanceTags.join(', ')}`;
}

console.log(flags.message);

const outputLines = [
  `android_final=${flags.android}`,
  `ios_final=${flags.ios}`,
  `e2e_needed=${flags.e2eNeeded}`,
  `use_main_builds_for_test_only_prs=${flags.useMainBuildsForTestOnlyPrs}`,
  `run_smart_e2e_selection=${flags.runSmartE2ESelection}`,
  `block_merge=${blockMerge}`,
  `run_performance=${runPerformance}`,
  `performance_tags=${JSON.stringify(performanceTags)}`,
  `performance_tags_reasoning=${performanceTagsReasoning}`,
  `changed_spec_files<<GH_EOF`,
  flags.changedSpecFiles,
  'GH_EOF',
];

appendFileSync(githubOutputPath, `${outputLines.join('\n')}\n`);
