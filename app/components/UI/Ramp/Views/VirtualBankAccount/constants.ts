import AppConstants from '../../../../../core/AppConstants';

// ISO 3166-1 alpha-3 country code; the VBA MVP is Brazil-only.
export const VBA_KYC_COUNTRY_CODE = 'BRA';

// Identity vendor for Get Pix Key. Passed at call time via
// `KycController.initialize({ vendor })` so Engine init stays vendor-agnostic.
export const VBA_KYC_VENDOR = 'iron' as const;

// eslint-disable-next-line @metamask/design-tokens/color-no-hex -- Pix's brand teal has no design-token equivalent
export const PIX_BRAND_COLOR = '#2CBFB0';

// MetaMask legal URLs on "Verify your identity". idOS / SumSub documents come
// from `KycController.fetchSessionDisclaimers` (via `useKycSessionDisclaimers`).
// Iron / MoonPay Enterprise T&Cs on Get Pix Key come from
// `KycController.loadDisclaimers` (via `useKycDisclaimers`).
export const METAMASK_PRIVACY_POLICY_URL = AppConstants.URLS.PRIVACY_POLICY;
export const METAMASK_TERMS_URL = AppConstants.URLS.TERMS_AND_CONDITIONS;

// Placeholder until KycController + idOS session supply a real applicant token.
export const MOCK_SUMSUB_APPLICANT_ACCESS_TOKEN = 'mock-applicant-access-token';
