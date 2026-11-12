import { strings } from '../../../../../locales/i18n';

const REASON_GROUP_BY_CODE: Record<string, string> = {
  ID_NOT_VERIFIED: 'id_document',
  ID_DOCUMENT_REQUIRED: 'id_document',
  ID_DOCUMENT_NOT_ACCEPTED: 'id_document',
  ID_DOCUMENT_EXPIRED: 'id_document',
  ID_DOCUMENT_MISSING_DOB: 'id_document',
  ID_DOCUMENT_SIDE_MISSING: 'id_document',
  ID_DOCUMENT_OTHER: 'id_document',
  DOCUMENT_PHOTO_UNCLEAR: 'document_photo',
  DOCUMENT_PHOTO_NOT_ORIGINAL: 'document_photo',
  DOCUMENT_PHOTO_OTHER: 'document_photo',
  NAME_NOT_VERIFIED: 'personal_details',
  ADDRESS_NOT_VERIFIED: 'personal_details',
  DOB_NOT_VERIFIED: 'personal_details',
  DOB_OR_ADDRESS_NOT_VERIFIED: 'personal_details',
  DETAILS_NOT_VERIFIED: 'personal_details',
  VISA_NOT_FOUND: 'personal_details',
  PROOF_OF_ADDRESS_REQUIRED: 'proof_of_address',
  PROOF_OF_ADDRESS_TOO_OLD: 'proof_of_address',
  PROOF_OF_ADDRESS_NOT_ACCEPTED: 'proof_of_address',
  PROOF_OF_ADDRESS_INCOMPLETE: 'proof_of_address',
  PROOF_OF_ADDRESS_OTHER: 'proof_of_address',
  BIOMETRICS_FAILED: 'biometrics',
  INELIGIBLE: 'ineligible',
  PROFILE_LIMIT_REACHED: 'ineligible',
};

/**
 * Turns Immersve reason codes into one localized explanation.
 * Unknown codes, including RETRIABLE, KYC_RESET and UNKNOWN, use the generic
 * line. A mix of known and unknown codes keeps only the known lines.
 */
export function describeImmersveKycRejection(
  reasons: string[] | undefined,
  canRetry: boolean,
): string {
  const groups: string[] = [];
  for (const code of reasons ?? []) {
    const group = REASON_GROUP_BY_CODE[code];
    if (!group || groups.includes(group)) {
      continue;
    }
    groups.push(group);
  }

  if (groups.length === 0) {
    return strings(
      canRetry
        ? 'card.card_onboarding.kyc_rejected.reasons.generic'
        : 'card.card_onboarding.kyc_rejected.reasons.generic_permanent',
    );
  }

  return groups
    .map((group) =>
      strings(`card.card_onboarding.kyc_rejected.reasons.${group}`),
    )
    .join(' ');
}
