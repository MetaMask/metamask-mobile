/* eslint-disable import-x/prefer-default-export */

// TODO: This should be consolidated into app/util/test/utils.js
// This needs to be updated to check for the METAMASK_ENVIRONMENT environment variable instead of NODE_ENV
// Once this is updated, verify that e2e smoke tests are working as expected
export const isProduction = (): boolean =>
  process.env.METAMASK_ENVIRONMENT === 'production';

export const isE2EMockOAuth = (): boolean =>
  process.env.E2E_MOCK_OAUTH === 'true';

export function getE2EByoaAuthSecret(): string | undefined {
  const secret = process.env.E2E_BYOA_AUTH_SECRET;
  return typeof secret === 'string' && secret.length > 0 ? secret : undefined;
}

export function getE2EMockOAuthEmailForQaMock(): string | undefined {
  const email = process.env.E2E_MOCK_OAUTH_EMAIL;
  return typeof email === 'string' && email.length > 0 ? email : undefined;
}
