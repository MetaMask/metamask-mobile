import { describeImmersveKycRejection } from './immersveKycReasons';

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

describe('describeImmersveKycRejection', () => {
  it('maps an ID document code to the document line', () => {
    expect(describeImmersveKycRejection(['ID_DOCUMENT_EXPIRED'], true)).toBe(
      'card.card_onboarding.kyc_rejected.reasons.id_document',
    );
  });

  it('keeps one line when several codes share a group', () => {
    expect(
      describeImmersveKycRejection(
        ['DOCUMENT_PHOTO_UNCLEAR', 'DOCUMENT_PHOTO_OTHER'],
        true,
      ),
    ).toBe('card.card_onboarding.kyc_rejected.reasons.document_photo');
  });

  it('joins distinct groups in the order the codes arrived', () => {
    expect(
      describeImmersveKycRejection(
        ['BIOMETRICS_FAILED', 'PROOF_OF_ADDRESS_TOO_OLD'],
        true,
      ),
    ).toBe(
      'card.card_onboarding.kyc_rejected.reasons.biometrics card.card_onboarding.kyc_rejected.reasons.proof_of_address',
    );
  });

  it('ignores unknown codes when a known code is present', () => {
    expect(
      describeImmersveKycRejection(['RETRIABLE', 'VISA_NOT_FOUND'], true),
    ).toBe('card.card_onboarding.kyc_rejected.reasons.personal_details');
  });

  it('uses the retry generic line for unknown codes when a retry is allowed', () => {
    expect(describeImmersveKycRejection(['KYC_RESET', 'UNKNOWN'], true)).toBe(
      'card.card_onboarding.kyc_rejected.reasons.generic',
    );
  });

  it('uses the permanent generic line when no retry is allowed', () => {
    expect(describeImmersveKycRejection(undefined, false)).toBe(
      'card.card_onboarding.kyc_rejected.reasons.generic_permanent',
    );
  });

  it('maps ineligible codes', () => {
    expect(describeImmersveKycRejection(['PROFILE_LIMIT_REACHED'], false)).toBe(
      'card.card_onboarding.kyc_rejected.reasons.ineligible',
    );
  });
});
