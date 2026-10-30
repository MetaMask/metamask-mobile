/**
 * Which extra consents the shared Verify your identity sheet shows.
 * VBA is the default and keeps today's documents and idOS biometric consent.
 * There is no Kalshi KYC route yet; callers pass this prop when one exists.
 */
export const KycConsentVendor = {
  Vba: 'vba',
  Kalshi: 'kalshi',
} as const;

export type KycConsentVendor =
  (typeof KycConsentVendor)[keyof typeof KycConsentVendor];

/** Socure DocV terms, linked from the Kalshi "Data and privacy" sheet. */
export const SOCURE_TERMS_OF_USE_URL =
  'https://www.socure.com/docv-terms-of-use';

/** Socure DocV privacy notice, linked from the same Kalshi sheet row. */
export const SOCURE_PRIVACY_NOTICE_URL = 'https://www.socure.com/docv-privacy';

/**
 * Socure Biometric Processing Agreement.
 * TODO(legal): BPA URL — Kalshi/Legal have not published this link yet.
 */
export const SOCURE_BIOMETRIC_PROCESSING_AGREEMENT_URL = 'TODO(legal): BPA URL';
