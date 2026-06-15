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

/**
 * Builds an onboarding install deeplink for E2E (mirrors production install links).
 */
export function buildE2EOnboardingInstallDeeplinkUrl(attributionFields: {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  attribution_id?: string;
}): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(attributionFields)) {
    if (value) {
      params.set(key, value);
    }
  }
  return `metamask://onboarding?${params.toString()}`;
}
