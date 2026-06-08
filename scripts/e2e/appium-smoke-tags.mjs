#!/usr/bin/env node
/**
 * Tags that have jobs in run-appium-smoke-tests-{android,ios}.yml.
 * When adding Appium smoke coverage for a category, append the tag here
 * and add matching jobs to both orchestrator workflows.
 */
export const APPIUM_SMOKE_TAGS = ['SmokeAccounts'];

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
