import AppConstants from '../../../../../core/AppConstants';

// Identity vendor for VBA onboarding. Passed to `KycController.startSession`.
export const VBA_KYC_VENDOR = 'iron' as const;

// eslint-disable-next-line @metamask/design-tokens/color-no-hex -- Pix's brand teal has no design-token equivalent
export const PIX_BRAND_COLOR = '#2CBFB0';

// MetaMask legal URLs on "Verify your identity". idOS / SumSub documents come
// from `KycController.fetchSessionDisclaimers` (via `useKycSessionDisclaimers`).
// Iron / MoonPay Enterprise T&Cs on the VBA introduction screen come from
// `KycController.fetchVendorDisclaimers` (via `useKycDisclaimers`).
export const METAMASK_PRIVACY_NOTICE_URL = AppConstants.URLS.PRIVACY_POLICY;
export const METAMASK_TERMS_URL = AppConstants.URLS.TERMS_AND_CONDITIONS;

// idOS Terms and Conditions in the "By tapping Agree" line on "Our verification
// partners". Used only when the session catalog has no end user agreement.
export const IDOS_TERMS_URL = 'https://www.idos.network/legal/user-agreement';

// idOS Privacy Notice linked from the biometric consent on "Our verification
// partners".
export const IDOS_PRIVACY_NOTICE_URL =
  'https://www.idos.network/legal/privacy-notice';

// Sumsub documents linked from the acknowledgement on "Our verification
// partners".
export const SUMSUB_PERSONAL_DATA_PROCESSING_URL =
  'https://sumsub.com/notification-to-processing-of-personal-data/';
export const SUMSUB_PRIVACY_NOTICE_URL =
  'https://sumsub.com/privacy-notice-service/';
export const SUMSUB_BIOMETRICS_CONSENT_URL =
  'https://sumsub.com/privacy-user-acknowledgement-and-consent/';

/**
 * idOS documents shown on "Our verification partners", in display order and
 * with the labels legal asked for. Catalog documents not listed here are hidden
 * from the screen (consent recording in `useLaunchSumSub` is unaffected).
 * The idOS Terms and Conditions aren't listed: the screen's footer line links
 * them instead.
 *
 * Entries match the catalog `id` (`${group}:${key}`), so a new document
 * version or a backend title change doesn't affect the list.
 */
export interface KycSessionDisclaimerDisplayEntry {
  group: 'idOS' | 'kycProvider';
  /** Catalog document `key` (stable across versions). */
  key: string;
  /** Locale key for the label shown on the screen. */
  titleKey: string;
}

export const KYC_SESSION_DISCLAIMER_DISPLAY: KycSessionDisclaimerDisplayEntry[] =
  [
    {
      group: 'idOS',
      key: 'privacy_policy',
      titleKey:
        'virtual_bank_account.verify_identity.terms_link_idos_privacy_policy',
    },
    {
      group: 'idOS',
      key: 'transparency_document',
      titleKey:
        'virtual_bank_account.verify_identity.terms_link_idos_transparency',
    },
  ];

// MoonPay Enterprise Privacy Policy on the VBA introduction screen. Iron's
// disclaimer catalog only supplies the T&C, so the Privacy Policy link is
// hardcoded per product/legal (TRAM-4169). Region-specific URLs are pending
// MoonPay confirmation; the global URL is safe while the flow is Brazil-only.
export const MOONPAY_PRIVACY_POLICY_URL =
  'https://www.moonpay.com/legal/privacy_policy';
