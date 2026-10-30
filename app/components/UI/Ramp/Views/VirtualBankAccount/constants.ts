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

// idOS Privacy Notice linked from the biometric consent on "Data and privacy".
export const IDOS_PRIVACY_NOTICE_URL =
  'https://www.idos.network/legal/privacy-notice';

/**
 * Consent copy on "Data and privacy". `vba` is today's Virtual Bank Account
 * sheet. `kalshi` adds Socure's documents, a merged idOS and Socure biometric
 * consent, and a separate Biometric Processing Agreement consent.
 *
 * This is not the KYC session vendor (`VBA_KYC_VENDOR`). There is no Kalshi
 * KYC route yet; callers pass `kalshi` when that entry point exists.
 */
export const KYC_CONSENT_VENDOR = {
  VBA: 'vba',
  KALSHI: 'kalshi',
} as const;

export type KycConsentVendor =
  (typeof KYC_CONSENT_VENDOR)[keyof typeof KYC_CONSENT_VENDOR];

export const SOCURE_TERMS_OF_USE_URL =
  'https://www.socure.com/docv-terms-of-use';

export const SOCURE_PRIVACY_NOTICE_URL = 'https://www.socure.com/docv-privacy';

/** TODO(legal): BPA URL */
export const SOCURE_BIOMETRIC_PROCESSING_AGREEMENT_URL = 'TODO(legal): BPA URL';

/**
 * Documents shown on the "Data and privacy" sheet, in display order and with
 * the labels legal asked for. Catalog documents not listed here are hidden from
 * the sheet (consent recording in `useLaunchSumSub` is unaffected).
 *
 * Entries match the catalog `id` (`${group}:${key}`), so a new document
 * version or a backend title change doesn't affect the list.
 */
export interface KycSessionDisclaimerDisplayEntry {
  group: 'idOS' | 'kycProvider';
  /** Catalog document `key` (stable across versions). */
  key: string;
  /** Locale key for the label shown on the sheet. */
  titleKey: string;
}

export const KYC_SESSION_DISCLAIMER_DISPLAY: KycSessionDisclaimerDisplayEntry[] =
  [
    {
      group: 'idOS',
      key: 'end_user_agreement',
      titleKey: 'virtual_bank_account.verify_identity.terms_link_idos_terms',
    },
    {
      group: 'idOS',
      key: 'privacy_notice',
      titleKey:
        'virtual_bank_account.verify_identity.terms_link_idos_privacy_notice',
    },
    {
      group: 'idOS',
      key: 'transparency_document',
      titleKey:
        'virtual_bank_account.verify_identity.terms_link_idos_transparency',
    },
    {
      group: 'kycProvider',
      key: 'notice_of_personal_data_processing',
      titleKey:
        'virtual_bank_account.verify_identity.terms_link_sumsub_privacy_notice',
    },
  ];

// MoonPay Enterprise Privacy Policy on the VBA introduction screen. Iron's
// disclaimer catalog only supplies the T&C, so the Privacy Policy link is
// hardcoded per product/legal (TRAM-4169). Region-specific URLs are pending
// MoonPay confirmation; the global URL is safe while the flow is Brazil-only.
export const MOONPAY_PRIVACY_POLICY_URL =
  'https://www.moonpay.com/legal/privacy_policy';
