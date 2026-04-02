import otaConfig from '../../ota.config.js';

/**
 * OTA update version for this native build.
 * Sentinel `vX.XX.X` means no OTA has shipped yet.
 * OTA hotfix: Runway uses a zero-padded patch in the branch name (e.g. `release/7.73.01`) so CI can detect OTA vs native hotfix.
 * `OTA_VERSION` keeps the raw Runway id with a `v` prefix (e.g. `v7.73.01`). No leading-zero normalization is applied.
 * Nightly / ad-hoc OTAs may use simple counters (`v0`, `v1`, …) per docs/nightly-ota-updates.md.
 * Reset when releasing a new native build as appropriate for that line.
 * Kept here (not only in ota.config.js) so changes there do not alter the Expo fingerprint and break CI.
 */
export const OTA_VERSION: string = 'vX.XX.X';
export const RUNTIME_VERSION = otaConfig.RUNTIME_VERSION;
export const PROJECT_ID = otaConfig.PROJECT_ID;
export const UPDATE_URL = otaConfig.UPDATE_URL;
