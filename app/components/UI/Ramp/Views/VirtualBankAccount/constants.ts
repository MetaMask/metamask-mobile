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

// Demo-only mock KYC flow (not production). Prefills so the teammate can
// tap through without typing.
export const MOCK_KYC_PREFILLED_EMAIL = 'demo@metamask.io';
export const MOCK_KYC_PROGRESS_STEPS = 4;

// Demo-only autoramp payload. The Ramps Dev API forwards this to MoonPay
// unchanged, so the vocabulary and casing are MoonPay's (PascalCase `type`,
// currency codes). Destination token uses MoonPay's branded `mUSD` symbol
// (autoramp create 400s on uppercase `MUSD`). `customer_id` is deliberately
// absent: RampsController resolves and injects it.
export const DEMO_AUTORAMP_SOURCE_CURRENCY_CODE = 'BRL';
export const DEMO_AUTORAMP_DESTINATION_TOKEN = 'mUSD';
export const DEMO_AUTORAMP_DESTINATION_BLOCKCHAIN = 'Monad';

// MoonPay self-hosted wallet registration via
// `RampsController.registerMoneyAccountWallet` hardcodes this chain in
// NeoBankService (`blockchain: 'Monad'`). Keep the demo autoramp destination
// aligned with this registration chain so MoonPay accepts the recipient.
export const MONEY_ACCOUNT_WALLET_REGISTRATION_BLOCKCHAIN = 'Monad';
