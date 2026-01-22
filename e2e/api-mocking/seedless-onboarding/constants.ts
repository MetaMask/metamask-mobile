export const PasswordChangeItemId = 'PW_BACKUP';

/**
 * Environment Configuration
 * UAT environment is used for E2E tests with QA mock endpoints
 */
export const AUTH_SERVICE_BASE_URL =
  'https://auth-service.uat-api.cx.metamask.io';

/**
 * Auth Server endpoints for OAuth token operations
 */
export const AuthServer = {
  // QA Mock endpoints for E2E tests
  MockRequestToken: `${AUTH_SERVICE_BASE_URL}/api/v1/qa/mock/oauth/token`,
  MockIdToken: `${AUTH_SERVICE_BASE_URL}/api/v1/qa/mock/oauth/id_token`,
  MockRenewRefreshToken: `${AUTH_SERVICE_BASE_URL}/api/v2/qa/mock/oauth/renew_refresh_token`,
  MockRevokeToken: `${AUTH_SERVICE_BASE_URL}/api/v2/qa/mock/oauth/revoke`,

  // Real endpoints (for reference - the app uses these, we mock the responses)
  RequestToken: `${AUTH_SERVICE_BASE_URL}/api/v1/oauth/token`,
  RevokeToken: `${AUTH_SERVICE_BASE_URL}/api/v2/oauth/revoke`,
  RenewRefreshToken: `${AUTH_SERVICE_BASE_URL}/api/v2/oauth/renew_refresh_token`,
  GetMarketingOptInStatus: `${AUTH_SERVICE_BASE_URL}/api/v1/oauth/marketing_opt_in_status`,
};

/**
 * E2E Test Email Patterns
 */
export const E2E_EMAILS = {
  // Google Login
  GOOGLE_NEW_USER: 'google.newuser+e2e@web3auth.io',
  GOOGLE_EXISTING_USER: 'google.existinguser+e2e@web3auth.io',

  // Apple Login
  APPLE_NEW_USER: 'apple.newuser+e2e@web3auth.io',
  APPLE_EXISTING_USER: 'apple.existinguser+e2e@web3auth.io',

  // Error scenarios
  ERROR_TIMEOUT: 'error.timeout+e2e@web3auth.io',
  ERROR_INVALID_TOKEN: 'error.invalid+e2e@web3auth.io',
  ERROR_NETWORK: 'error.network+e2e@web3auth.io',
  ERROR_AUTH_FAILED: 'error.authfailed+e2e@web3auth.io',
};

/**
 * E2E Test Scenarios
 * Maps email patterns to expected behaviors
 */
export enum E2EScenario {
  NEW_USER = 'new_user',
  EXISTING_USER = 'existing_user',
  ERROR_TIMEOUT = 'error_timeout',
  ERROR_INVALID = 'error_invalid',
  ERROR_NETWORK = 'error_network',
  ERROR_AUTH_FAILED = 'error_auth_failed',
}

/**
 * Login Providers supported in E2E tests
 */
export enum E2ELoginProvider {
  GOOGLE = 'google',
  APPLE = 'apple',
}

/**
 * Parse E2E email to determine test scenario
 * @param email - E2E email address
 * @returns The test scenario based on email pattern
 */
export function parseE2EScenario(email: string): E2EScenario {
  if (email.includes('newuser')) return E2EScenario.NEW_USER;
  if (email.includes('existinguser')) return E2EScenario.EXISTING_USER;
  if (email.includes('error.timeout')) return E2EScenario.ERROR_TIMEOUT;
  if (email.includes('error.invalid')) return E2EScenario.ERROR_INVALID;
  if (email.includes('error.network')) return E2EScenario.ERROR_NETWORK;
  if (email.includes('error.authfailed')) return E2EScenario.ERROR_AUTH_FAILED;
  return E2EScenario.NEW_USER; // Default to new user
}

/**
 * SSS Node Key Pairs for each of the 5 nodes (UAT environment)
 * Used for encrypting/decrypting key shares
 */
export const SSSNodeKeyPairs: {
  [nodeIndex: number]: { pubKey: string; privKey: string };
} = {
  1: {
    pubKey:
      '04b6a0af1372430d21536c9317b3f2e8ecf053236ae9ca8a0f0ab03dd07d13dc634f4c07194ec80c8aa1fdc0c8dfcf719a872155166bfc1e2ed27c295d4dfccd98',
    privKey: 'c376367061b28d03b569e60fb6feed5246eb20060d1464f7a9d170993ba84544',
  },
  2: {
    pubKey:
      '047ceccc9ad0415111973bf21814273c4aa4431673e9eb6d35abbf903084e8d2096d9f34c50f5c627f152fa1eef1d3f83851ef00f01e13228ba684f17e268b20fa',
    privKey: '1340e7abecdefa4c424afbd97d3ec410350cc18b277c5caf2edbd0c388411a0d',
  },
  3: {
    pubKey:
      '046d3727f50b088b6f465d611af6bcbb57d04bd054b4cea0f8b4aade5a67e3c7f0759c9a1916e0d2ef3c9639e6bd97e510ee5a40cda2339e5df0cb9a2fbf9e7144',
    privKey: '6d466e55a5a0e9b8f00a3e676f85ccca1db0aa1dbde5c570aa68d3aaa55eded1',
  },
  4: {
    pubKey:
      '047eac8164381bc1a02f2ddc01b0fd4b20eb1a24b908a6a7ad6d31b215f6f0789022475d323664ace72c6db05c62d96ad5d57b0283034f6aa12bfa57e1672e33cb',
    privKey: '10ff6103ff2627ba0b27486683ed421250d27afb245c983ab690ccebb9b7c87a',
  },
  5: {
    pubKey:
      '0439bd322c77c582ae9252ae32fd405da7995fa2c3a7319029771bac15100f2452a3cbf1c4086d12b1691bb1c78dec77342349447be8862165fa0a51bd30b7e427',
    privKey: '5233e5c1c7f3aff542bc2a3f7fcf63d2cbe352365f553e36880bd83b3ea6c861',
  },
};

/**
 * E2E Test Secret Recovery Phrase
 */
export const E2E_SRP =
  'spread raise short crane omit tent fringe mandate neglect detail suspect cradle';
