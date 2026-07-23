/* eslint-disable import-x/no-commonjs, import-x/no-extraneous-dependencies */
/* global globalThis */
/**
 * Idempotent loader for `reflect-metadata`, used exclusively for the
 * Ledger DMK + inversify stack.
 *
 * The Metro polyfill bootstrap loads `reflect-metadata` once at app
 * startup, but that load runs as a serializer-injected preamble and is
 * not registered in Metro's `__d` module cache. When a lazy chunk
 * (e.g. the DMK closure loaded from `getDmk`) later evaluates
 * `require("reflect-metadata")`, Metro re-runs the file body. The IIFE
 * is not idempotent: it calls
 * `Object.defineProperty(globalThis.Reflect, registrySymbol, { configurable: false, ... })`
 * during `GetOrCreateMetadataRegistry`, so the second run throws
 * `TypeError: property is not configurable`.
 *
 * Metro's `resolveRequest` rewrites `require("reflect-metadata")` to
 * this shim only when the importer is inside the Ledger DMK closure
 * (DMK itself, its sibling Ledger packages, and the inversify DI
 * substrate). Other consumers (e.g. the nested 0.1.x copies under
 * `@consensys/*-ramps-sdk`, which use their own bundled copy) are
 * untouched.
 *
 * The guard checks the live state of `globalThis.Reflect.metadata`
 * rather than a private flag, so the shim is a no-op whenever the
 * polyfill has already populated Reflect (always true after the Metro
 * polyfill bootstrap at app startup).
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
