#!/usr/bin/env node
/**
 * Smoke tags executed by Appium CI.
 * Android: run-appium-smoke-tests-android.yml (ci.yml).
 * iOS: run-appium-smoke-tests-ios.yml (run-appium-smoke-tests-ios-scheduled.yml).
 * Append a tag here and add a matching job to each orchestrator.
 */
export const APPIUM_SMOKE_TAGS = ['SmokeAccounts', 'SmokePerps'];

/**
 * @param {string | string[]} selectedTags JSON array string or parsed tags
 * @returns {boolean}
 */
export function shouldRunAppiumSmoke(selectedTags) {
  const tags =
    typeof selectedTags === 'string' ? JSON.parse(selectedTags) : selectedTags;

  if (!Array.isArray(tags)) {
    return false;
  }

  if (tags.includes('ALL')) {
    return true;
  }

  return APPIUM_SMOKE_TAGS.some((tag) => tags.includes(tag));
}

const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith('appium-smoke-tags.mjs') ||
    process.argv[1].endsWith('appium-smoke-tags'));

if (isMain) {
  const selectedTagsJson = process.argv[2] ?? '["ALL"]';
  process.stdout.write(shouldRunAppiumSmoke(selectedTagsJson) ? 'true' : 'false');
}
