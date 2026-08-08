/**
 * Navigation parameters for the SDK Connect V2 OTP bottom sheet.
 */
export interface SDKConnectV2OtpModalParams {
  /**
   * One-time linking code issued by the wallet for the CLI/dApp to enter.
   */
  otp: string;
  /**
   * Display name of the dApp/CLI requesting the link.
   */
  dappName: string;
  /**
   * Absolute expiry time as Unix epoch milliseconds. Used to render a live countdown.
   */
  deadline: number;
}
