import AppConstants from '../../../../../core/AppConstants';

// Identity vendor for VBA onboarding. Passed to `KycController.startSession`.
export const VBA_KYC_VENDOR = 'iron' as const;

// eslint-disable-next-line @metamask/design-tokens/color-no-hex -- Pix's brand teal has no design-token equivalent
export const PIX_BRAND_COLOR = '#2CBFB0';

// MetaMask legal URLs on "Verify your identity". idOS / SumSub documents come
// from `KycController.fetchSessionDisclaimers` (via `useKycSessionDisclaimers`).
// Iron / MoonPay Enterprise T&Cs on the VBA introduction screen come from
// `KycController.fetchVendorDisclaimers` (via `useKycDisclaimers`).
export const METAMASK_PRIVACY_POLICY_URL = AppConstants.URLS.PRIVACY_POLICY;
export const METAMASK_TERMS_URL = AppConstants.URLS.TERMS_AND_CONDITIONS;

// MoonPay Enterprise Privacy Policy on the VBA introduction screen. Iron's
// disclaimer catalog only supplies the T&C, so the Privacy Policy link is
// hardcoded per product/legal (TRAM-4169). Region-specific URLs are pending
// MoonPay confirmation; the global URL is safe while the flow is Brazil-only.
export const MOONPAY_PRIVACY_POLICY_URL =
  'https://www.moonpay.com/legal/privacy_policy';

// Avenia, MoonPay's regulated partner for virtual asset services in Brazil.
// Linked from the legal line on the Pix account details screen (TRAM-4397).
export const AVENIA_URL = 'https://avenia.io/';

// SumSub documents linked from the partner terms. The catalog's own links are
// used when they match; these are the fallback so the sentence never renders
// a link as plain text.
export const SUMSUB_PERSONAL_DATA_PROCESSING_URL =
  'https://sumsub.com/notification-to-processing-of-personal-data/';
export const SUMSUB_PRIVACY_NOTICE_URL =
  'https://sumsub.com/privacy-notice-service/';
export const SUMSUB_BIOMETRICS_CONSENT_URL =
  'https://sumsub.com/privacy-user-acknowledgement-and-consent/';
