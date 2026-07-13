#!/usr/bin/env node
/**
 * GitHub Actions entrypoint for compute-e2e-platform-flags.ts.
 */

require('esbuild-register/dist/node').register({
  target: 'node18',
});

const fs = require('node:fs');
const {
  computeE2EPlatformFlags,
} = require('./compute-e2e-platform-flags.ts');

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

const flags = computeE2EPlatformFlags({
  githubEventName: process.env.GITHUB_EVENT_NAME || '',
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
  allChangesFiles: process.env.ALL_CHANGES_FILES || '',
});

let runAppiumIos = false;
if (
  process.env.GITHUB_EVENT_NAME === 'pull_request' &&
  !readBool(process.env.IS_FORK)
) {
  if (readBool(process.env.RUN_APPIUM_IOS_LABEL)) {
    runAppiumIos = true;
    console.log(
      "-> RUN_APPIUM_IOS=true due to 'run-appium-ios-tests' label on PR",
    );
  } else if (readInt(process.env.E2E_SMOKE_INFRA_COUNT) > 0) {
    runAppiumIos = true;
    console.log(
      '-> RUN_APPIUM_IOS=true due to e2e smoke infra changes (page-objects/selectors/locators/framework)',
    );
  }
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
  `changed_files<<GH_EOF`,
  flags.changedFiles,
  'GH_EOF',
];

fs.appendFileSync(githubOutputPath, `${outputLines.join('\n')}\n`);
