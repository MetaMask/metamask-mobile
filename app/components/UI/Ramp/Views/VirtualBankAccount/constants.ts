import AppConstants from '../../../../../core/AppConstants';

// ISO 3166-1 alpha-3 country code; the VBA MVP is Brazil-only.
export const VBA_KYC_COUNTRY_CODE = 'BRA';

// Identity vendor for Get Pix Key. Passed at call time via
// `KycController.initialize({ vendor })` so Engine init stays vendor-agnostic.
export const VBA_KYC_VENDOR = 'iron' as const;

// eslint-disable-next-line @metamask/design-tokens/color-no-hex -- Pix's brand teal has no design-token equivalent
export const PIX_BRAND_COLOR = '#2CBFB0';

// Legal URLs on the "Verify your identity" screen. MetaMask's come from
// AppConstants; idOS has no standalone terms page, so its User Agreement
// is the equivalent document.
//
// Iron / MoonPay Enterprise T&Cs on Get Pix Key come from
// `KycController.loadDisclaimers` (via `useKycDisclaimers`), not these
// static URLs. Do not fetch idOS / SumSub catalog disclaimers here.
export const METAMASK_PRIVACY_POLICY_URL = AppConstants.URLS.PRIVACY_POLICY;
export const METAMASK_TERMS_URL = AppConstants.URLS.TERMS_AND_CONDITIONS;
export const IDOS_PRIVACY_POLICY_URL =
  'https://www.idos.network/legal/privacy-policy';
export const IDOS_TERMS_URL = 'https://www.idos.network/legal/user-agreement';
export const SUMSUB_PRIVACY_POLICY_URL = 'https://sumsub.com/privacy-notice/';
export const SUMSUB_TERMS_URL = 'https://sumsub.com/terms-and-conditions/';

// Placeholder until KycController + idOS session supply a real applicant token.
export const MOCK_SUMSUB_APPLICANT_ACCESS_TOKEN = 'mock-applicant-access-token';
