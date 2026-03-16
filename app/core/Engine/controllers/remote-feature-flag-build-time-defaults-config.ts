/**
 * Config for build-time defaults.
 * Production: uses GITHUB_ACTIONS and E2E. Tests: mock this module to control shouldApply().
 */
export const buildTimeDefaultsConfig = {
  shouldApply(): boolean {
    return (
      process.env.BUILDS_ENABLED_WITH_GH_ACTIONS_TEMPORARY === 'true' &&
      process.env.E2E !== 'true'
    );
  },
};
