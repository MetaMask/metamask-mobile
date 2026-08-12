// Legal URLs shown on the VBA (Virtual Bank Account) "Get your Pix Key" screen.
// MoonPay's is the real public policy; Trace's is a placeholder pending the
// real legal URL from the Iron/Trace integration team.
export const MOONPAY_PRIVACY_POLICY_URL =
  'https://www.moonpay.com/legal/privacy_policy';
export const MOONPAY_TERMS_URL = 'https://www.moonpay.com/legal/terms_of_use';
export const TRACE_TERMS_URL = 'https://www.trace.money/legal/terms';

// Legal URLs shown on the VBA "Verify your identity" screen's "Data and
// privacy" disclosure. MetaMask's and Sumsub's are real public policies;
// idOS's are placeholders pending the real legal URLs from that integration.
export const METAMASK_PRIVACY_POLICY_URL =
  'https://consensys.io/privacy-policy';
export const METAMASK_TERMS_URL = 'https://metamask.io/terms.html';
export const IDOS_PRIVACY_POLICY_URL =
  'https://www.idos.network/privacy-policy';
export const IDOS_TERMS_URL = 'https://www.idos.network/terms';
export const SUMSUB_PRIVACY_POLICY_URL = 'https://sumsub.com/privacy-notice/';
export const SUMSUB_TERMS_URL = 'https://sumsub.com/terms-and-conditions/';

// Demo-only mock KYC flow (not production). Prefills so the teammate can
// tap through without typing.
export const MOCK_KYC_PREFILLED_EMAIL = 'demo@metamask.io';
export const MOCK_KYC_PROGRESS_STEPS = 4;

// Demo-only autoramp payload. The Ramps Dev API forwards this to MoonPay
// unchanged, so the vocabulary is MoonPay's. `customer_id` is deliberately
// absent: RampsController injects it from the KYC controller's identity.
export const DEMO_AUTORAMP_SOURCE_CURRENCY_CODE = 'brl';
export const DEMO_AUTORAMP_DESTINATION_TOKEN = 'usdc';
export const DEMO_AUTORAMP_DESTINATION_BLOCKCHAIN = 'ethereum';
