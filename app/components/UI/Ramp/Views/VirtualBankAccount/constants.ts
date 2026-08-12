// ISO 3166-1 alpha-3 country code the VBA KYC API scopes disclaimers to.
// This MVP is Brazil-only.
export const VBA_KYC_COUNTRY_CODE = 'BRA';

/**
 * Base URL of the VBA KYC API (`va-mmcx-universal-kyc-api`), used by
 * `useKycDisclaimers` to fetch the vendor's current Privacy Policy / T&C
 * links instead of hardcoding them. That service isn't deployed to a
 * reachable environment yet, so this is empty by default, in which case
 * `useKycDisclaimers` skips the fetch and callers fall back to the static
 * URLs below. Set `MM_VBA_KYC_API_BASE_URL` locally once a dev URL exists.
 *
 * This whole fetch-it-ourselves setup is a stand-in for the real
 * `@metamask/kyc-controller` integration, which isn't published/wired into
 * Engine yet; swap it out once that package lands.
 */
export const KYC_API_BASE_URL = process.env.MM_VBA_KYC_API_BASE_URL ?? '';

// Fallback legal URLs shown on the VBA "Get your Pix Key" screen when the
// dynamic disclaimers fetch above is unavailable (not configured, loading,
// or errored). MoonPay's is the real public policy; Trace's is a
// placeholder pending the real legal URL from the Iron/Trace integration
// team.
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
