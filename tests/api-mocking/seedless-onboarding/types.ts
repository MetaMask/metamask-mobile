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
 * Payload for Mockttp `/metadata/enc_account_data/get` responses.
 * Matches `@metamask/toprf-secure-backup` `MetadataStore` `_getAllDataItems` parsing:
 * parallel arrays `data`, `ids`, `versions` (required per item); optional `dataTypes`,
 * `createdAt` aligned by index.
 */
export interface EncAccountDataGetMockPayload {
  data: string[];
  ids: string[];
  versions: ('v1' | 'v2')[];
  dataTypes?: (number | null | undefined)[];
  createdAt?: (string | null | undefined)[];
}
