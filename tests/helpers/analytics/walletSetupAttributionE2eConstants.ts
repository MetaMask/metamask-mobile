/**
 * Persisted attribution fields preloaded in E2E fixtures for TO-718
 * (`Wallet Setup Completed` acquisition props). Must match
 * `FixtureBuilder.withWalletSetupAttributionForE2e` usage in specs.
 */
export const E2E_WALLET_SETUP_ATTRIBUTION_FIELDS = {
  utm_source: 'e2e_wsc_utm_source',
  utm_campaign: 'e2e_wsc_campaign',
  attribution_id: 'e2e_wsc_attr_id',
} as const;
