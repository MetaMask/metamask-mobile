/* eslint-disable import-x/prefer-default-export */

// TODO: This should be consolidated into app/util/test/utils.js
// This needs to be updated to check for the METAMASK_ENVIRONMENT environment variable instead of NODE_ENV
// Once this is updated, verify that e2e smoke tests are working as expected
export const isProduction = (): boolean =>
  process.env.METAMASK_ENVIRONMENT === 'production';

export const isGatorPermissionsFeatureEnabled = (): boolean =>
  process.env.GATOR_PERMISSIONS_ENABLED?.toString() === 'true';

export const isE2EMockOAuth = (): boolean =>
  process.env.E2E_MOCK_OAUTH === 'true';

/**
 * Whether the Ramps WebSocket debug dashboard bridge may load (only called under `__DEV__`).
 * Opt-in only: set `RAMPS_DEBUG_DASHBOARD=true` in `.js.env` (or your shell) so devs who do not
 * use the dashboard avoid fetch instrumentation and the reconnect loop.
 */
export const isRampsDebugDashboardEnabled = (): boolean =>
  process.env.RAMPS_DEBUG_DASHBOARD === 'true';

export const getE2EByoaAuthSecret = (): string | undefined => {
  const secret = process.env.E2E_BYOA_AUTH_SECRET;
  return typeof secret === 'string' && secret.length > 0 ? secret : undefined;
};

export const getE2EMockOAuthEmailForQaMock = (): string | undefined => {
  const email = process.env.E2E_MOCK_OAUTH_EMAIL;
  return typeof email === 'string' && email.length > 0 ? email : undefined;
};
