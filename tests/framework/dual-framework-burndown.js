/**
 * Dual-framework lint burndown allowlist.
 * Listed files may keep legacy FrameworkDetector / encapsulated / Playwright*
 * imports until migrated to Gestures / Assertions / Matchers.
 * Do not add new files.
 */
// eslint-disable-next-line import-x/no-commonjs
module.exports = {
  pageObjectsAndFlows: [],
  smokeAppium: [],
};
