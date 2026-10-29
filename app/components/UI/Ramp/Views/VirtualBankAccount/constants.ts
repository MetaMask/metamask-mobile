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
