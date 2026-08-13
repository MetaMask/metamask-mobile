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
      // when this is empty.
      return '';
  }
};

/**
 * Base URL of the VBA KYC API, used by `useKycDisclaimers` to fetch the
 * vendor's current Privacy Policy / T&C links for Get Pix Key display.
 *
 * Demo Iron → Sumsub still loads controller disclaimers via
 * `KycController.initialize`; this fetch is the temporary UI source until
 * screens read Iron disclaimers from controller state.
 */
export const KYC_API_BASE_URL = getKycApiBaseUrlForMetaMaskEnv();

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
// unchanged, so the vocabulary and casing are MoonPay's (PascalCase `type`,
// uppercase currency codes). `customer_id` is deliberately absent:
// RampsController resolves and injects it.
export const DEMO_AUTORAMP_SOURCE_CURRENCY_CODE = 'BRL';
export const DEMO_AUTORAMP_DESTINATION_TOKEN = 'USDC';
export const DEMO_AUTORAMP_DESTINATION_BLOCKCHAIN = 'Monad';

// MoonPay self-hosted wallet registration via
// `RampsController.registerMoneyAccountWallet` hardcodes this chain in
// NeoBankService (`blockchain: 'Monad'`). Keep the demo autoramp destination
// aligned with this registration chain so MoonPay accepts the recipient.
export const MONEY_ACCOUNT_WALLET_REGISTRATION_BLOCKCHAIN = 'Monad';
