/* eslint-disable import-x/no-commonjs */
/**
 * Path fragments matched against Metro `originModulePath` to scope the
 * `reflect-metadata` idempotent shim to the Ledger DMK closure (the only
 * consumer of `reflect-metadata@0.2.x` in this app).
 *
 * All five Ledger DMK ESM packages, plus their DI substrate (inversify and
 * `@inversifyjs/*`), live under one of these path fragments. Other consumers
 * (e.g. nested `reflect-metadata@0.1.14` copies inside `@consensys/*-ramps-sdk`)
 * resolve normally to their package-local copy.
 *
 * Fragments use forward slashes. Callers MUST normalize `originModulePath`
 * (see {@link isDmkReflectMetadataImporter}) before matching — Metro on
 * Windows uses `\`, and raw `.includes(fragment)` would miss DMK importers.
 *
 * See `app/shims/reflect-metadata-once.js` for why the second IIFE must be
 * short-circuited.
 */
const DMK_REFLECT_METADATA_IMPORTERS = [
  'node_modules/@ledgerhq/',
  'node_modules/inversify',
  'node_modules/@inversifyjs/',
];

/**
 * True when `reflect-metadata` is being resolved from the Ledger DMK /
 * Inversify closure and should be redirected to the idempotent shim.
 *
 * Normalizes separators first so Windows Metro paths (`\`) match the
 * forward-slash fragments — same pattern as `isPerpsControllerOrigin` in
 * `metro.config.js`.
 *
 * @param {string | null | undefined} originModulePath
 * @returns {boolean}
 */
const isDmkReflectMetadataImporter = (originModulePath) => {
  const normalizedOrigin = (originModulePath ?? '').replace(/\\/g, '/');
  return DMK_REFLECT_METADATA_IMPORTERS.some((fragment) =>
    normalizedOrigin.includes(fragment),
  );
};

module.exports = {
  DMK_REFLECT_METADATA_IMPORTERS,
  isDmkReflectMetadataImporter,
};
