/**
 * Seedless Onboarding E2E Test Type Definitions
 */

/**
 * Options for OAuthMockttpService setup
 */
export interface OAuthMockttpServiceOptions {
  /**
   * User email - if provided, simulates existing user
   * If not provided (undefined), simulates new user
   *
   * For backend QA mock integration, use E2E email patterns:
   * - *newuser+e2e@web3auth.io -> New user flow
   * - *existinguser+e2e@web3auth.io -> Existing user flow
   * - *error.*+e2e@web3auth.io -> Error scenarios
   */
  userEmail?: string;

  /**
   * If true, simulates password outdated scenario
   */
  passwordOutdated?: boolean;

  /**
   * If true, throws authentication error during unlock
   */
  throwAuthenticationErrorAtUnlock?: boolean;

  /**
   * Whether to mock metadata service endpoints
   * Default: true
   * Set to false if backend handles metadata mocking
   */
  mockMetadataService?: boolean;

  /**
   * Login provider type for the OAuth flow
   */
  loginProvider?: 'google' | 'apple';
}

/**
 * SecretType enum matching @metamask/seedless-onboarding-controller
 */
export enum SecretType {
  Mnemonic = 'mnemonic',
  PrivateKey = 'privateKey',
}
