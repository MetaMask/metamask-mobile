import otaConfig from '../../ota.config.js';

/**
 * OTA update version for this native build.
 * Sentinel `vX.XX.X` means no OTA has shipped yet.
 * OTA hotfix branches are `release/X.Y.Z-ota` (e.g. `release/7.75.2-ota`); CI detects OTA
 * via the `-ota` suffix, not via patch-digit encoding. The `-ota` suffix lives on the branch
 * name only — `OTA_VERSION`, the CHANGELOG.md header, and the production git tag all use the
 * bare v-prefixed semver (e.g. `v7.75.2`). Runway always increments the patch past any
 * existing native tag on the same X.Y line, so `v<X.Y.Z>` never collides with a native tag.
 * Nightly / ad-hoc OTAs may use simple counters (`v0`, `v1`, …) per docs/nightly-ota-updates.md.
 * Reset when releasing a new native build as appropriate for that line.
 * Kept here (not only in ota.config.js) so changes there do not alter the Expo fingerprint and break CI.
 */
export const OTA_VERSION: string = 'vX.XX.X';

/**
 * Auto RC OTA revision label (e.g. `8.0.1.2`) for RC-channel testers: the 4th decimal counts
 * OTA updates published on top of the current native RC build, and resets on each new native
 * build (see .github/workflows/build-rc-auto.yml).
 *
 * This is display-only and deliberately separate from production versioning — `package.json`,
 * native build numbers, and `OTA_VERSION` are untouched by the Auto RC OTA flow. It is set as an
 * env var by CI at publish time and inlined here by babel-plugin-transform-inline-environment-variables
 * (the same mechanism as `GIT_BRANCH`), so no commit to the release branch is needed. Empty for
 * every other flow, including local builds and the manual Runway OTA flows.
 */
export const OTA_RC_AUTO_LABEL: string = process.env.OTA_RC_AUTO_LABEL || '';

export const RUNTIME_VERSION = otaConfig.RUNTIME_VERSION;
export const PROJECT_ID = otaConfig.PROJECT_ID;
export const UPDATE_URL = otaConfig.UPDATE_URL;
