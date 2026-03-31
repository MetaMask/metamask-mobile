import otaConfig from '../../ota.config.js';

/**
 * OTA update version for this native build.
 * Sentinel `vX.XX.X` means no OTA has shipped yet.
 * OTA hotfix release branches (`release/X.Y.Z` with zero-padded patch, e.g. `7.71.01`) set this to `v` + that
 * semver (e.g. `v7.71.01`) so it matches production OTA tags and Runway.
 * Nightly / ad-hoc OTAs may use simple counters (`v0`, `v1`, …) per docs/nightly-ota-updates.md.
 * Reset when releasing a new native build as appropriate for that line.
 * Kept here (not only in ota.config.js) so changes there do not alter the Expo fingerprint and break CI.
 */
export const OTA_VERSION: string = 'v101.1.02';
export const RUNTIME_VERSION = otaConfig.RUNTIME_VERSION;
export const PROJECT_ID = otaConfig.PROJECT_ID;
export const UPDATE_URL = otaConfig.UPDATE_URL;
