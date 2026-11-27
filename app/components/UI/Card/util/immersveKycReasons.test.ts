import {
  describeImmersveKycFinal,
  describeImmersveKycReasonLines,
} from './immersveKycReasons';

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const line = (key: string) => `card.card_onboarding.kyc_reasons.${key}`;

describe('describeImmersveKycReasonLines', () => {
  it('returns one line per failed check, in the order the codes arrived', () => {
    expect(
      describeImmersveKycReasonLines([
        'ID_DOCUMENT_EXPIRED',
        'BIOMETRICS_FAILED',
      ]),
    ).toStrictEqual([line('id_document_expired'), line('biometrics_failed')]);
  });

  it('drops a repeated code', () => {
    expect(
      describeImmersveKycReasonLines([
        'DOCUMENT_PHOTO_UNCLEAR',
        'DOCUMENT_PHOTO_UNCLEAR',
      ]),
    ).toStrictEqual([line('document_photo_unclear')]);
  });

  it('returns only the first incomplete step', () => {
    expect(
      describeImmersveKycReasonLines([
        'PROOF_OF_ADDRESS_REQUIRED',
        'IDV_NOT_COMPLETED',
      ]),
    ).toStrictEqual([line('proof_of_address_required')]);
  });

  it('prefers failed checks over incomplete steps', () => {
    expect(
      describeImmersveKycReasonLines([
        'IDV_NOT_COMPLETED',
        'NAME_NOT_VERIFIED',
      ]),
    ).toStrictEqual([line('name_not_verified')]);
  });

  it('gives RETRIABLE the generic line when no specific failure is present', () => {
    expect(describeImmersveKycReasonLines(['RETRIABLE'])).toStrictEqual([
      line('generic_retry'),
    ]);
  });

  it('drops RETRIABLE when a specific failure is present', () => {
    expect(
      describeImmersveKycReasonLines(['RETRIABLE', 'VISA_NOT_FOUND']),
    ).toStrictEqual([line('visa_not_found')]);
  });

  it.each([
    ['CHECKS_IN_PROGRESS'],
    ['KYC_RESET'],
    ['UNKNOWN'],
    ['INELIGIBLE'],
    ['PROFILE_LIMIT_REACHED'],
    ['SOME_NEW_CODE'],
  ])('shows nothing for %s', (code) => {
    expect(describeImmersveKycReasonLines([code])).toStrictEqual([]);
  });

  it('shows nothing without reasons', () => {
    expect(describeImmersveKycReasonLines(undefined)).toStrictEqual([]);
  });
});

describe('describeImmersveKycFinal', () => {
  it('uses the ineligible copy for INELIGIBLE', () => {
    expect(describeImmersveKycFinal(['INELIGIBLE'])).toStrictEqual({
      title: 'card.card_onboarding.kyc_failed.ineligible_title',
      description: 'card.card_onboarding.kyc_failed.ineligible_description',
    });
  });

  it.each([
    [['PROFILE_LIMIT_REACHED']],
    [['UNKNOWN']],
    [['SOME_NEW_CODE']],
    [[]],
    [undefined],
  ])('sends %p to support', (reasons) => {
    expect(describeImmersveKycFinal(reasons)).toStrictEqual({
      title: 'card.card_onboarding.kyc_failed.support_title',
      description: 'card.card_onboarding.kyc_failed.support_description',
    });
  });
});
