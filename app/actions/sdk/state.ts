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

/**
 * Per-connection WalletConnect metadata, captured at proposal time and
 * enriched during the session's lifetime.
 */
export interface WC2SessionMetadata {
  url: string;
  name: string;
  icon: string;
  verifyContext?: WC2VerifyContext;
  /** Most recent unverified origin observed in an RPC request on this session. */
  lastVerifiedUrl?: string;
}

export interface SDKState {
  connections: SDKSessions;
  approvedHosts: ApprovedHosts;
  dappConnections: SDKSessions;
  v2Connections: SDKSessions;
  /**
   * Per-connection WalletConnect metadata, keyed by pairing topic (a.k.a.
   * `channelId`). Replaces the legacy single-slot `wc2Metadata` so that
   * concurrent sessions don't clobber each other.
   */
  wc2SessionMetadata: Record<string, WC2SessionMetadata>;
}
