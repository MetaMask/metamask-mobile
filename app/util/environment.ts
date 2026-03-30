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

export const getE2EByoaAuthSecret = (): string | undefined => {
  const secret = process.env.E2E_BYOA_AUTH_SECRET;
  return typeof secret === 'string' && secret.length > 0 ? secret : undefined;
};

export const getE2EMockOAuthEmailForQaMock = (): string | undefined => {
  const email = process.env.E2E_MOCK_OAUTH_EMAIL;
  return typeof email === 'string' && email.length > 0 ? email : undefined;
};

/**
 * Whether the RAMPS WebSocket debug bridge to the local dashboard is enabled.
 * Set `RAMPS_DEBUG_DASHBOARD=true` in `.js.env` and restart Metro (build-time inline).
 *
 * @see app/components/UI/Ramp/debug/README.md
 */
export const isRampsDebugDashboardEnabled = (): boolean =>
  process.env.RAMPS_DEBUG_DASHBOARD === 'true';

/**
 * WebSocket URL for `ramps-debug-dashboard` (default host loopback).
 * Override with `RAMPS_DEBUG_DASHBOARD_URL` in `.js.env` for devices/emulators.
 *
 * @see app/components/UI/Ramp/debug/README.md
 */
export const getRampsDebugDashboardWebSocketUrl = (): string => {
  const url = process.env.RAMPS_DEBUG_DASHBOARD_URL;
  if (typeof url === 'string' && url.trim().length > 0) {
    return url.trim();
  }
  return 'ws://localhost:8099';
};
