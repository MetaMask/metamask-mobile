import AppConstants from '../../../../../core/AppConstants';

// ISO 3166-1 alpha-3 country code the VBA KYC API scopes disclaimers to.
// This MVP is Brazil-only.
export const VBA_KYC_COUNTRY_CODE = 'BRA';

// Pix's brand teal, used for the "pix" badge on the Get Pix Key screen. Pix
// is a Brazilian instant-payment rail, not a MetaMask concept, so it has no
// design-system color token — this matches Pix's own brand color.
// eslint-disable-next-line @metamask/design-tokens/color-no-hex -- Pix's brand color has no design-token equivalent
export const PIX_BRAND_COLOR = '#2CBFB0';

// Deployed hosts for the VBA KYC API (`va-mmcx-universal-kyc-api`), per its
// ArgoCD workload repo (`va-mmcx-kyc-api-workload`, workload/<env>/main).
// Production isn't deployed yet.
const KYC_API_DEV_BASE_URL = 'https://kyc-api.dev-api.cx.metamask.io';
const KYC_API_UAT_BASE_URL = 'https://kyc-api.uat-api.cx.metamask.io';

/**
 * Resolves the VBA KYC API base URL for the current MetaMask environment.
 *
 * `MM_VBA_KYC_API_BASE_URL` lets developers point the app at a custom
 * deployment (e.g. a local server), bypassing the environment-based mapping.
 *
 * @returns the VBA KYC API base URL for the current MetaMask environment
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
      // Not deployed to production yet; `useKycDisclaimers` skips the fetch
      // and callers fall back to the static URLs below.
      return '';
  }
};

/**
 * Base URL of the VBA KYC API, used by `useKycDisclaimers` to fetch the
 * vendor's current Privacy Policy / T&C links instead of hardcoding them.
 *
 * This whole fetch-it-ourselves setup is a stand-in for the real
 * `@metamask/kyc-controller` integration, which isn't published/wired into
 * Engine yet; swap it out once that package lands.
 */
export const KYC_API_BASE_URL = getKycApiBaseUrlForMetaMaskEnv();

// Legal URLs shown on the VBA "Verify your identity" screen's "Data and
// privacy" disclosure. MetaMask's come from AppConstants so they stay in
// sync with the rest of the app; partner URLs are verified live. idOS has
// no standalone "terms" page — its User Agreement is the equivalent.
export const METAMASK_PRIVACY_POLICY_URL = AppConstants.URLS.PRIVACY_POLICY;
export const METAMASK_TERMS_URL = AppConstants.URLS.TERMS_AND_CONDITIONS;
export const IDOS_PRIVACY_POLICY_URL =
  'https://www.idos.network/legal/privacy-policy';
export const IDOS_TERMS_URL = 'https://www.idos.network/legal/user-agreement';
export const SUMSUB_PRIVACY_POLICY_URL = 'https://sumsub.com/privacy-notice/';
export const SUMSUB_TERMS_URL = 'https://sumsub.com/terms-and-conditions/';
