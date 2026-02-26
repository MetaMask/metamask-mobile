/**
 * Config for build-time defaults.
 * Production: uses GITHUB_ACTIONS and E2E. Tests: mock this module to control shouldApply().
 */
export const buildTimeDefaultsConfig = {
  shouldApply(): boolean {
    return process.env.GITHUB_ACTIONS === 'true' && process.env.E2E !== 'true';
  },
};
