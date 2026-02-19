export enum TrustSignalDisplayState {
  Loading = 'loading',
  Malicious = 'malicious',
  Petname = 'petname',
  Verified = 'verified',
  Warning = 'warning',
  Recognized = 'recognized',
  Unknown = 'unknown',
}

export enum AddressScanResultType {
  Benign = 'Benign',
  Loading = 'Loading',
  Malicious = 'Malicious',
  Trusted = 'Trusted',
  Warning = 'Warning',
}

export interface TrustSignalResult {
  state: TrustSignalDisplayState;
  label: string | null;
}

export interface AddressTrustSignalRequest {
  address: string;
  chainId: string;
}
