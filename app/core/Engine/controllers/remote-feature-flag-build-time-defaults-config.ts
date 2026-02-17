/**
 * Config for build-time defaults.
 * Apply when REMOTE_FEATURE_FLAG_DEFAULTS is set (GH Actions via apply-build-config.js,
 * or local/Bitrise via Metro loading builds.yml in metro.config.js) and not E2E.
 * Tests: mock this module to control shouldApply().
 */
export const buildTimeDefaultsConfig = {
  shouldApply(): boolean {
    const hasDefaults =
      typeof process.env.REMOTE_FEATURE_FLAG_DEFAULTS === 'string' &&
      process.env.REMOTE_FEATURE_FLAG_DEFAULTS.length > 0;
    return hasDefaults && process.env.E2E !== 'true';
  },
};
