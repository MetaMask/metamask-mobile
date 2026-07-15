import { ApprovedHosts, SDKSessions } from '../../core/SDKConnect/SDKConnect';

/**
 * WalletConnect Verify API validation states.
 * @see https://docs.walletconnect.network/wallet-sdk/react-native/verify
 */
export enum WC2VerifyValidation {
  VALID = 'VALID',
  INVALID = 'INVALID',
  UNKNOWN = 'UNKNOWN',
}

/**
 * WalletConnect Verify API context included in session proposals.
 */
export interface WC2VerifyContext {
  /** Whether the domain is flagged as a known scam/malicious site. */
  isScam?: boolean;
  /** Domain verification status: VALID (verified match), INVALID (mismatch), UNKNOWN (unverified). */
  validation?: WC2VerifyValidation;
  /** The actual verified origin of the request. */
  verifiedOrigin?: string;
}

export interface WC2Metadata {
  id: string;
  url: string;
  name: string;
  icon: string;
  lastVerifiedUrl?: string;
  verifyContext?: WC2VerifyContext;
}
export interface SDKState {
  connections: SDKSessions;
  approvedHosts: ApprovedHosts;
  dappConnections: SDKSessions;
  v2Connections: SDKSessions;
  // Link to metadata of last created wallet connect session.
  wc2Metadata?: WC2Metadata;
}
