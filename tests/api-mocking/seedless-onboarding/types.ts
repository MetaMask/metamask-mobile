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
