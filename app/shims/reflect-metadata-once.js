/* eslint-disable import-x/no-commonjs, import-x/no-extraneous-dependencies */
/* global globalThis */
/**
 * Prevents Ledger DMK and Inversify from re-running `reflect-metadata`.
 *
 * Metro's pre-lockdown polyfill is not added to its module cache, so later
 * imports would execute it again after LavaMoat hardens `Reflect` and throw
 * `TypeError: property is not configurable`. This shim makes those imports
 * no-ops once the metadata API is installed.
 */
if (
  typeof globalThis.Reflect === 'undefined' ||
  typeof globalThis.Reflect.metadata !== 'function'
) {
  // Use the package subpath so this require bypasses the Metro
  // resolveRequest alias (which only matches the bare specifier) and
  // loads the real polyfill.
  require('reflect-metadata/Reflect.js');
}

module.exports = {};
