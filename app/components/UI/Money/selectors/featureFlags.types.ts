export interface MoneyVaultApyRemoteConfig {
  /** Used when serviceApy is undefined (third-party outage). */
  vaultApyFallback: number | undefined;
  /** When configured, always shown instead of serviceApy. */
  vaultApyOverride: number | undefined;
}
