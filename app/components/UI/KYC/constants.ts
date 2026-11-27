import AppConstants from '../../../core/AppConstants';

/**
 * MetaMask legal URLs on "Verify your identity". idOS and SumSub documents
 * come from `KycController.fetchSessionDisclaimers`.
 */
export const METAMASK_PRIVACY_POLICY_URL = AppConstants.URLS.PRIVACY_POLICY;
export const METAMASK_TERMS_URL = AppConstants.URLS.TERMS_AND_CONDITIONS;

/**
 * SumSub documents linked from the partner terms. The catalog's own links are
 * used when they match; these are the fallback so a link never renders as
 * plain text.
 */
export const SUMSUB_PERSONAL_DATA_PROCESSING_URL =
  'https://sumsub.com/notification-to-processing-of-personal-data/';
export const SUMSUB_PRIVACY_NOTICE_URL =
  'https://sumsub.com/privacy-notice-service/';
export const SUMSUB_BIOMETRICS_CONSENT_URL =
  'https://sumsub.com/privacy-user-acknowledgement-and-consent/';

/**
 * idOS Terms and Conditions (published as the User Agreement). Fallback for the
 * "I agree to idOS Terms and Conditions" footer link when the catalog has no
 * matching document, so the link never renders as dead text.
 */
export const IDOS_TERMS_AND_CONDITIONS_URL =
  'https://www.idos.network/legal/user-agreement';

/** Fallback for the Kalshi terms footer when the catalog has no privacy policy. */
export const KALSHI_PRIVACY_POLICY_URL = 'https://kalshi.com/privacy-policy';

/** Socure documents linked from the Kalshi biometric consent. */
export const SOCURE_TERMS_OF_USE_URL =
  'https://www.socure.com/docv-terms-of-use';
export const SOCURE_PRIVACY_NOTICE_URL = 'https://www.socure.com/privacy-en';
