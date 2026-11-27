export interface MoneyVaultApyRemoteConfig {
  /** Used when serviceApy is undefined (third-party outage). */
  vaultApyFallback: number | undefined;
  /** When configured, always shown instead of serviceApy. */
  vaultApyOverride: number | undefined;
  /** Used for entitled users when the premium rate is missing or not positive. */
  premiumVaultApyFallback: number | undefined;
  /** When configured, always shown to entitled users instead of the premium rate. */
  premiumVaultApyOverride: number | undefined;
}
