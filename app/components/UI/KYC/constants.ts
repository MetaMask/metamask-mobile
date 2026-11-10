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
