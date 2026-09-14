#!/usr/bin/env node
/**
 * GitHub Actions entrypoint for compute-e2e-platform-flags.mjs.
 */

import { appendFileSync } from 'node:fs';
import {
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
const ignorableCount = readInt(process.env.IGNORABLE_COUNT);
const e2eWorkflowsCount = readInt(process.env.E2E_WORKFLOWS_COUNT);

const ignorableOnly =
  allChangesCount > 0 &&
  ignorableCount === allChangesCount &&
  e2eWorkflowsCount === 0;

const testOnlyChanges =
  allChangesCount > 0 &&
  readInt(process.env.E2E_TEST_OR_IGNORABLE_COUNT) >= allChangesCount &&
  readInt(process.env.E2E_TEST_FILES_COUNT) > 0 &&
  e2eWorkflowsCount === 0;

const skipSmartSelection = readBool(process.env.SKIP_SMART_SELECTION);

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
    prBaseRef: process.env.PR_BASE_REF || '',
    isFork: readBool(process.env.IS_FORK),
    shouldSkipE2E: readBool(process.env.SHOULD_SKIP_E2E),
    allChangesCount,
    ignorableCount,
    e2eTestFilesCount: readInt(process.env.E2E_TEST_FILES_COUNT),
    e2eTestOrIgnorableCount: readInt(process.env.E2E_TEST_OR_IGNORABLE_COUNT),
    e2eWorkflowsCount,
    androidCount: readInt(process.env.ANDROID_COUNT),
    iosCount: readInt(process.env.IOS_COUNT),
    androidOrIgnorableCount: readInt(process.env.ANDROID_OR_IGNORABLE_COUNT),
    iosOrIgnorableCount: readInt(process.env.IOS_OR_IGNORABLE_COUNT),
    changedSpecFiles: process.env.CHANGED_SPEC_FILES || '',
  },
  labelOverrideInput,
  skipSmartSelection,
  e2eSmokeInfraCount: readInt(process.env.E2E_SMOKE_INFRA_COUNT),
});

const runAppiumIos = flags.runAppiumIos;

// Only explain a run that is actually happening — flags.runAppiumIos is the
// resolved value, and it is always false for PRs into main.
if (!runAppiumIos) {
  if (
    labelOverrideInput.githubEventName === 'pull_request' &&
    labelOverrideInput.prBaseRef === 'main'
  ) {
    console.log(
      '-> RUN_APPIUM_IOS=false — iOS not requested for this PR into main. Add run-appium-ios-tests, or skip-smart-e2e-selection when path filters already require iOS.',
    );
  }
} else if (labelOverrideInput.runAppiumIosLabel) {
  console.log(
    "-> RUN_APPIUM_IOS=true due to 'run-appium-ios-tests' label on PR",
  );
} else if (skipSmartSelection && flags.ios) {
  console.log(
    "-> RUN_APPIUM_IOS=true due to 'skip-smart-e2e-selection' label on PR (iOS already required by path filters)",
  );
} else if (readInt(process.env.E2E_SMOKE_INFRA_COUNT) > 0) {
  console.log(
    '-> RUN_APPIUM_IOS=true due to e2e smoke infra changes (page-objects/selectors/locators/framework/smoke-appium)',
  );
}

let blockMerge = false;
if (readBool(process.env.LABEL_BLOCKS_MERGE) && !ignorableOnly) {
  blockMerge = true;
} else if (readBool(process.env.LABEL_BLOCKS_MERGE) && ignorableOnly) {
  console.log(
    '-> BLOCK_MERGE bypassed — ignorable-only changes, E2E_WORKFLOWS_COUNT=0',
  );
}

let runPerformance = false;
if (
  process.env.GITHUB_EVENT_NAME === 'pull_request' &&
  process.env.PR_BASE_REF !== 'stable' &&
  !readBool(process.env.IS_FORK) &&
  readBool(process.env.RUN_PERFORMANCE_LABEL)
) {
  runPerformance = true;
}

console.log(flags.message);

const outputLines = [
  `android_final=${flags.android}`,
  `ios_final=${flags.ios}`,
  `e2e_needed=${flags.e2eNeeded}`,
  `native_build_needed=${flags.nativeBuildNeeded}`,
  `run_smart_e2e_selection=${flags.runSmartE2ESelection}`,
  `block_merge=${blockMerge}`,
  `run_performance=${runPerformance}`,
  `run_appium_ios=${runAppiumIos}`,
  `changed_spec_files<<GH_EOF`,
  flags.changedSpecFiles,
  'GH_EOF',
];

appendFileSync(githubOutputPath, `${outputLines.join('\n')}\n`);
