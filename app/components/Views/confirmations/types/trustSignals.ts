/**
 * Enum representing the display state of a trust signal.
 */
export enum TrustSignalDisplayState {
  Loading = 'loading',
  Malicious = 'malicious',
  Petname = 'petname',
  Verified = 'verified',
  Warning = 'warning',
  Recognized = 'recognized',
  Unknown = 'unknown',
}

/**
 * Result type from address/token scan API.
 */
export enum AddressScanResultType {
  Benign = 'Benign',
  Loading = 'Loading',
  Malicious = 'Malicious',
  Warning = 'Warning',
}

/**
 * Result of a trust signal check.
 */
export interface TrustSignalResult {
  state: TrustSignalDisplayState;
  label: string | null;
}

/**
 * Request for address trust signal check.
 */
export interface AddressTrustSignalRequest {
  address: string;
  chainId: string;
}
