#!/usr/bin/env node
/**
 * Tags that have a job in run-appium-smoke-tests-ios.yml.
 * When adding Appium iOS coverage for a smoke category, append the tag here
 * and add a matching job to the orchestrator workflow.
 */
export const APPIUM_IOS_SMOKE_TAGS = ['SmokeAccounts'];

/**
 * @param {string | string[]} selectedTags JSON array string or parsed tags
 * @returns {boolean}
 */
export function shouldRunAppiumIosSmoke(selectedTags) {
  const tags =
    typeof selectedTags === 'string' ? JSON.parse(selectedTags) : selectedTags;

  if (!Array.isArray(tags)) {
    return false;
  }

  if (tags.includes('ALL')) {
    return true;
  }

  return APPIUM_IOS_SMOKE_TAGS.some((tag) => tags.includes(tag));
}

const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith('appium-ios-smoke-tags.mjs') ||
    process.argv[1].endsWith('appium-ios-smoke-tags'));

if (isMain) {
  const selectedTagsJson = process.argv[2] ?? '["ALL"]';
  process.stdout.write(shouldRunAppiumIosSmoke(selectedTagsJson) ? 'true' : 'false');
}
