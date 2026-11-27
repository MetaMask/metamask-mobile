import { strings } from '../../../../../locales/i18n';

/** Incomplete steps, in Immersve's flow order. The first one is the next step. */
const NEXT_STEP_CODES = new Set([
  'CONTACT_DETAILS_REQUIRED',
  'EXPECTED_SPEND_REQUIRED',
  'RESIDENTIAL_ADDRESS_REQUIRED',
  'PROOF_OF_ADDRESS_REQUIRED',
  'IDV_NOT_COMPLETED',
  'ID_DOCUMENT_REQUIRED',
]);

/** Failed checks the user can fix. They come as a set: show every one. */
const FAILURE_CODES = new Set([
  'ID_NOT_VERIFIED',
  'NAME_NOT_VERIFIED',
  'ADDRESS_NOT_VERIFIED',
  'DOB_NOT_VERIFIED',
  'DOB_OR_ADDRESS_NOT_VERIFIED',
  'DETAILS_NOT_VERIFIED',
  'VISA_NOT_FOUND',
  'ID_DOCUMENT_NOT_ACCEPTED',
  'ID_DOCUMENT_EXPIRED',
  'ID_DOCUMENT_MISSING_DOB',
  'ID_DOCUMENT_SIDE_MISSING',
  'ID_DOCUMENT_OTHER',
  'DOCUMENT_PHOTO_UNCLEAR',
  'DOCUMENT_PHOTO_NOT_ORIGINAL',
  'DOCUMENT_PHOTO_OTHER',
  'PROOF_OF_ADDRESS_TOO_OLD',
  'PROOF_OF_ADDRESS_NOT_ACCEPTED',
  'PROOF_OF_ADDRESS_INCOMPLETE',
  'PROOF_OF_ADDRESS_OTHER',
  'BIOMETRICS_FAILED',
]);

const reasonLine = (key: string) =>
  strings(`card.card_onboarding.kyc_reasons.${key}`);

export const describeImmersveKycGenericRetry = () =>
  reasonLine('generic_retry');

/**
 * Lines for the Finish-verifying screen: every fixable failure, else
 * RETRIABLE's generic line (Immersve won't say why), else the next step.
 * Any other code, including new ones, shows nothing.
 */
export function describeImmersveKycReasonLines(
  reasons: string[] | undefined,
): string[] {
  const codes = [...new Set(reasons ?? [])];
  const failures = codes.filter((code) => FAILURE_CODES.has(code));
  if (failures.length > 0) {
    return failures.map((code) => reasonLine(code.toLowerCase()));
  }
  if (codes.includes('RETRIABLE')) {
    return [describeImmersveKycGenericRetry()];
  }
  const nextStep = codes.find((code) => NEXT_STEP_CODES.has(code));
  return nextStep ? [reasonLine(nextStep.toLowerCase())] : [];
}

/**
 * Final (`blocked`) copy. Never gives a reason. INELIGIBLE gets the
 * "can't offer" message; PROFILE_LIMIT_REACHED, UNKNOWN
 * and new codes send the user to support.
 */
export function describeImmersveKycFinal(reasons: string[] | undefined): {
  title: string;
  description: string;
} {
  const variant = reasons?.includes('INELIGIBLE') ? 'ineligible' : 'support';
  return {
    title: strings(`card.card_onboarding.kyc_failed.${variant}_title`),
    description: strings(
      `card.card_onboarding.kyc_failed.${variant}_description`,
    ),
  };
}
