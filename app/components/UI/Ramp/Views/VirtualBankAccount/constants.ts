import AppConstants from '../../../../../core/AppConstants';

// ISO 3166-1 alpha-3 country code; the VBA MVP is Brazil-only.
export const VBA_KYC_COUNTRY_CODE = 'BRA';

// eslint-disable-next-line @metamask/design-tokens/color-no-hex -- Pix's brand teal has no design-token equivalent
export const PIX_BRAND_COLOR = '#2CBFB0';

// VBA KYC API (`va-mmcx-universal-kyc-api`) hosts. Production isn't deployed yet.
const KYC_API_DEV_BASE_URL = 'https://kyc-api.dev-api.cx.metamask.io';
const KYC_API_UAT_BASE_URL = 'https://kyc-api.uat-api.cx.metamask.io';

/**
 * Resolves the VBA KYC API base URL for the current MetaMask environment.
 * `MM_VBA_KYC_API_BASE_URL` overrides the mapping (e.g. for a local server).
 */
const getKycApiBaseUrlForMetaMaskEnv = (): string => {
  if (process.env.MM_VBA_KYC_API_BASE_URL) {
    return process.env.MM_VBA_KYC_API_BASE_URL;
  }

  switch (process.env.METAMASK_ENVIRONMENT) {
    case 'exp':
      return KYC_API_UAT_BASE_URL;
    case 'dev':
    case 'test':
    case 'e2e':
    case 'local':
      return KYC_API_DEV_BASE_URL;
    case 'production':
    case 'beta':
    case 'rc':
    case 'pre-release':
    default:
      // Not deployed to production yet; `useKycDisclaimers` skips the fetch.
      return '';
  }
};

/**
 * Base URL of the VBA KYC API. The client-side fetch in `useKycDisclaimers`
 * is a stand-in for `@metamask/kyc-controller`, which isn't published or
 * wired into Engine yet; swap it out once that lands.
 */
export const KYC_API_BASE_URL = getKycApiBaseUrlForMetaMaskEnv();

// Legal URLs on the "Verify your identity" screen. MetaMask's come from
// AppConstants; idOS has no standalone terms page, so its User Agreement
// is the equivalent document.
export const METAMASK_PRIVACY_POLICY_URL = AppConstants.URLS.PRIVACY_POLICY;
export const METAMASK_TERMS_URL = AppConstants.URLS.TERMS_AND_CONDITIONS;
export const IDOS_PRIVACY_POLICY_URL =
  'https://www.idos.network/legal/privacy-policy';
export const IDOS_TERMS_URL = 'https://www.idos.network/legal/user-agreement';
export const SUMSUB_PRIVACY_POLICY_URL = 'https://sumsub.com/privacy-notice/';
export const SUMSUB_TERMS_URL = 'https://sumsub.com/terms-and-conditions/';

/**
 * Optional already-minted applicant access token. Production tokens come from
 * the KYC API. Leave unset: the native SDK still launches, then fails
 * Unauthorized unless `__DEV__` sandbox mint credentials below are set.
 */
export const SUMSUB_ACCESS_TOKEN = process.env.MM_SUMSUB_ACCESS_TOKEN ?? '';

/**
 * Dev-only Sumsub Dashboard Sandbox App Token (`sbx:` prefix). Used to mint an
 * applicant access token so Continue can get past Unauthorized. Never a CI or
 * GitHub secret. Production builds ignore this even if it is present.
 */
export const SUMSUB_SANDBOX_APP_TOKEN =
  process.env.MM_SUMSUB_SANDBOX_APP_TOKEN ?? '';

/**
 * Dev-only Sumsub Dashboard Sandbox secret key paired with
 * {@link SUMSUB_SANDBOX_APP_TOKEN}. Never a CI or GitHub secret.
 */
export const SUMSUB_SANDBOX_SECRET_KEY =
  process.env.MM_SUMSUB_SANDBOX_SECRET_KEY ?? '';

/**
 * Verification level name from the same Sandbox workspace (case-sensitive).
 * Required for sandbox mint. Example from Sumsub docs: `basic-kyc-level`.
 */
export const SUMSUB_SANDBOX_LEVEL_NAME =
  process.env.MM_SUMSUB_SANDBOX_LEVEL_NAME ?? '';

/**
 * Applicant `userId` / `externalUserId` bound to the minted token. Stable so
 * relaunches reuse the same sandbox applicant. Override to start a new profile.
 */
export const SUMSUB_SANDBOX_USER_ID =
  process.env.MM_SUMSUB_SANDBOX_USER_ID ?? 'mm-mobile-vba-sandbox';
