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
 * Result of a trust signal check.
 */
export interface TrustSignalResult {
  state: TrustSignalDisplayState;
  label: string | null;
}
