/* eslint-disable import/prefer-default-export */

// TODO: This should be consolidated into app/util/test/utils.js
// This needs to be updated to check for the METAMASK_ENVIRONMENT environment variable instead of NODE_ENV
// Once this is updated, verify that e2e smoke tests are working as expected
export const isProduction = (): boolean =>
  // TODO: process.env.NODE_ENV === 'production' doesn't work with tests yet. Once we make it work,
  // we can remove the following line and use the code above instead.
  ({ ...process.env })?.METAMASK_ENVIRONMENT === 'production';

export const isGatorPermissionsFeatureEnabled = (): boolean =>
  process.env.GATOR_PERMISSIONS_ENABLED?.toString() === 'true';
