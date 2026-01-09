/**
 * Seedless Onboarding E2E Test Type Definitions
 * Matching MetaMask Extension's implementation
 */

/**
 * TOPRF JSON-RPC request method types
 */
export type ToprfJsonRpcRequestMethod =
  | 'TOPRFCommitmentRequest'
  | 'TOPRFAuthenticateRequest'
  | 'TOPRFStoreKeyShareRequest'
  | 'TOPRFEvalRequest'
  | 'TOPRFResetRateLimitRequest'
  | 'TOPRFGetPubKeyRequest';

/**
 * Parameters for TOPRF commitment request
 */
export interface ToprfCommitmentRequestParams {
  token_commitment: string;
  verifier: string;
  temp_pub_key_x: string;
  temp_pub_key_y: string;
}

/**
 * Response from TOPRF authenticate request
 */
export interface ToprfAuthenticateResponse {
  auth_token: string;
  node_index: number;
  node_pub_key: string;
  pub_key?: string;
  key_index?: number;
}

/**
 * Share import item for TOPRF store key share request
 */
export interface ShareImportItem {
  encrypted_share: string;
  encrypted_auth_token: string;
  key_share_index: number;
  node_index: number;
  sss_endpoint: string;
}

/**
 * Parameters for TOPRF store key share request
 */
export interface ToprfStoreKeyShareRequestParams {
  pub_key: string;
  verifier: string;
  verifier_id: string;
  share_import_items: ShareImportItem[];
}

/**
 * Parameters for TOPRF eval request
 */
export interface ToprfEvalRequestParams {
  auth_token: string;
  share_coefficient: string;
  blinded_input_x: string;
  blinded_input_y: string;
  verifier: string;
  verifier_id: string;
}

/**
 * Generic TOPRF JSON-RPC request body
 */
export interface ToprfJsonRpcRequestBody<Params> {
  method: ToprfJsonRpcRequestMethod;
  params: Params;
}

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
}

/**
 * SecretType enum matching @metamask/seedless-onboarding-controller
 */
export enum SecretType {
  Mnemonic = 'mnemonic',
  PrivateKey = 'privateKey',
}

/**
 * Secret data structure for metadata encryption
 */
export interface SecretData {
  data: Uint8Array;
  timestamp?: number;
  type?: SecretType;
}
