// Identity vendor for VBA onboarding. Passed to `KycController.startSession`.
export const VBA_KYC_VENDOR = 'iron' as const;

// eslint-disable-next-line @metamask/design-tokens/color-no-hex -- Pix's brand teal has no design-token equivalent
export const PIX_BRAND_COLOR = '#2CBFB0';

// MoonPay Enterprise Privacy Policy on the VBA introduction screen. Iron's
// disclaimer catalog only supplies the T&C, so the Privacy Policy link is
// hardcoded per product/legal (TRAM-4169). Region-specific URLs are pending
// MoonPay confirmation; the global URL is safe while the flow is Brazil-only.
export const MOONPAY_PRIVACY_POLICY_URL =
  'https://www.moonpay.com/legal/privacy_policy';

// Avenia, MoonPay's regulated partner for virtual asset services in Brazil.
// Linked from the legal line on the Pix account details screen (TRAM-4397).
export const AVENIA_URL = 'https://avenia.io/';

// MoonPay risk page linked from the USD account details footer (TRAM-4455).
export const MOONPAY_RISK_URL = 'https://www.moonpay.com/legal/risk';
