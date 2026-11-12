import type { CardSpendingPrerequisite } from '../../../../core/Engine/controllers/card-controller/provider-types';
import { deriveNextImmersveAction } from './immersvePrerequisites';

const contactEmail: CardSpendingPrerequisite = {
  stage: 'kyc',
  status: 'action-required',
  actionType: 'submit_contact_email',
};
const contactPhone: CardSpendingPrerequisite = {
  stage: 'kyc',
  status: 'action-required',
  actionType: 'submit_contact_phone',
};
const kycUrl: CardSpendingPrerequisite = {
  stage: 'kyc',
  status: 'action-required',
  actionType: 'follow_kyc_url',
  params: { kycUrl: 'https://verify.immersve.com' },
};
const expectedSpend: CardSpendingPrerequisite = {
  stage: 'kyc',
  status: 'action-required',
  actionType: 'set_expected_spend_amount',
};
const funding: CardSpendingPrerequisite = {
  stage: 'funding',
  status: 'action-required',
  actionType: 'smart_contract_write',
  params: {
    abi: [],
    contractAddress: '0xToken',
    method: 'approve',
    params: { _spender: '0xSpender', _value: '1000000' },
  },
};
const amlPending: CardSpendingPrerequisite = {
  stage: 'aml',
  status: 'pending',
};
const ok = (
  stage: CardSpendingPrerequisite['stage'],
): CardSpendingPrerequisite => ({
  stage,
  status: 'ok',
});

describe('deriveNextImmersveAction', () => {
  it('returns contact with both flags when email and phone are required', () => {
    expect(
      deriveNextImmersveAction([
        contactEmail,
        contactPhone,
        funding,
        amlPending,
      ]),
    ).toStrictEqual({ type: 'contact', needsEmail: true, needsPhone: true });
  });

  it('returns contact with only the missing channel', () => {
    expect(deriveNextImmersveAction([contactPhone])).toStrictEqual({
      type: 'contact',
      needsEmail: false,
      needsPhone: true,
    });
  });

  it('prioritises contact over KYC and funding', () => {
    expect(deriveNextImmersveAction([funding, kycUrl, contactEmail]).type).toBe(
      'contact',
    );
  });

  it('returns the KYC url when contact is satisfied', () => {
    expect(deriveNextImmersveAction([kycUrl, funding])).toStrictEqual({
      type: 'kyc',
      url: 'https://verify.immersve.com',
      ctaHint: undefined,
      reasons: [],
    });
  });

  it.each([
    'KYC_NOT_COMPLETED',
    'KYC_INFORMATION_NEEDED',
    'KYC_EXPIRING',
  ] as const)('carries the %s ctaHint on the kyc action', (ctaHint) => {
    expect(deriveNextImmersveAction([{ ...kycUrl, ctaHint }])).toStrictEqual({
      type: 'kyc',
      url: 'https://verify.immersve.com',
      ctaHint,
      reasons: [],
    });
  });

  it('reads ctaHint from params when not on the entry', () => {
    expect(
      deriveNextImmersveAction([
        {
          ...kycUrl,
          params: { ...kycUrl.params, ctaHint: 'KYC_INFORMATION_NEEDED' },
        },
      ]),
    ).toStrictEqual({
      type: 'kyc',
      url: 'https://verify.immersve.com',
      ctaHint: 'KYC_INFORMATION_NEEDED',
      reasons: [],
    });
  });

  it('carries reason codes on a KYC action', () => {
    expect(
      deriveNextImmersveAction([
        {
          ...kycUrl,
          ctaHint: 'KYC_INFORMATION_NEEDED',
          params: {
            ...kycUrl.params,
            reasons: [{ code: 'ID_DOCUMENT_EXPIRED', description: 'partner' }],
          },
        },
      ]),
    ).toStrictEqual({
      type: 'kyc',
      url: 'https://verify.immersve.com',
      ctaHint: 'KYC_INFORMATION_NEEDED',
      reasons: ['ID_DOCUMENT_EXPIRED'],
    });
  });

  it('returns expected_spend before funding', () => {
    expect(deriveNextImmersveAction([funding, expectedSpend]).type).toBe(
      'expected_spend',
    );
  });

  it('returns funding with the smart_contract_write params once identity is ok', () => {
    const result = deriveNextImmersveAction([funding, ok('kyc'), ok('aml')]);
    expect(result.type).toBe('funding');
    if (result.type === 'funding') {
      expect(result.write.method).toBe('approve');
      expect(result.write.params._spender).toBe('0xSpender');
    }
  });

  it('holds on pending while KYC is outstanding even if funding is ready', () => {
    expect(
      deriveNextImmersveAction([
        funding,
        { stage: 'kyc', status: 'pending' },
        ok('aml'),
      ]).type,
    ).toBe('pending');
  });

  it('holds on pending while AML is outstanding even if funding is ready', () => {
    expect(
      deriveNextImmersveAction([funding, amlPending, ok('kyc')]).type,
    ).toBe('pending');
  });

  it('returns rejected over funding when KYC is blocked', () => {
    expect(
      deriveNextImmersveAction([funding, { stage: 'kyc', status: 'blocked' }])
        .type,
    ).toBe('rejected');
  });

  it('returns rejected over funding when the KYC check failed', () => {
    expect(
      deriveNextImmersveAction([
        funding,
        {
          stage: 'kyc',
          status: 'kyc_check_failed',
          params: { kycUrl: 'https://verify.immersve.com/retry' },
        },
      ]),
    ).toStrictEqual({
      type: 'rejected',
      canRetry: true,
      retryUrl: 'https://verify.immersve.com/retry',
      reasons: [],
    });
  });

  it('returns pending when only pending stages remain', () => {
    expect(deriveNextImmersveAction([amlPending, ok('kyc')]).type).toBe(
      'pending',
    );
  });

  it('returns active when every stage is ok', () => {
    expect(
      deriveNextImmersveAction([ok('funding'), ok('kyc'), ok('aml')]).type,
    ).toBe('active');
  });

  it('returns active for an empty prerequisites list', () => {
    expect(deriveNextImmersveAction([]).type).toBe('active');
  });

  it('returns rejected when a KYC stage is permanently blocked', () => {
    expect(
      deriveNextImmersveAction([{ stage: 'kyc', status: 'blocked' }]),
    ).toStrictEqual({
      type: 'rejected',
      canRetry: false,
      retryUrl: undefined,
      reasons: [],
    });
  });

  it('does not retry a blocked check even when a new KYC link is present', () => {
    expect(
      deriveNextImmersveAction([
        { stage: 'kyc', status: 'blocked' },
        {
          stage: 'kyc',
          status: 'action-required',
          actionType: 'follow_kyc_url',
          params: { kycUrl: 'https://verify.immersve.com/retry' },
        },
      ]),
    ).toStrictEqual({
      type: 'rejected',
      canRetry: false,
      retryUrl: undefined,
      reasons: [],
    });
  });

  it('returns rejected with the retry url on a failed KYC check', () => {
    expect(
      deriveNextImmersveAction([
        {
          stage: 'kyc',
          status: 'kyc_check_failed',
          params: {
            kycUrl: 'https://verify.immersve.com/retry',
            reasons: [{ code: 'DOCUMENT_PHOTO_UNCLEAR' }],
          },
        },
      ]),
    ).toStrictEqual({
      type: 'rejected',
      canRetry: true,
      retryUrl: 'https://verify.immersve.com/retry',
      reasons: ['DOCUMENT_PHOTO_UNCLEAR'],
    });
  });

  it('uses a separate follow_kyc_url as the retry link after a failed check', () => {
    expect(
      deriveNextImmersveAction([
        {
          stage: 'kyc',
          status: 'kyc_check_failed',
          params: { reasons: ['ID_NOT_VERIFIED'] },
        },
        {
          stage: 'kyc',
          status: 'action-required',
          actionType: 'follow_kyc_url',
          params: { kycUrl: 'https://verify.immersve.com/retry' },
        },
      ]),
    ).toStrictEqual({
      type: 'rejected',
      canRetry: true,
      retryUrl: 'https://verify.immersve.com/retry',
      reasons: ['ID_NOT_VERIFIED'],
    });
  });

  it('cannot retry a failed check that has no KYC link', () => {
    expect(
      deriveNextImmersveAction([
        { stage: 'kyc', status: 'kyc_check_failed', params: {} },
      ]),
    ).toStrictEqual({
      type: 'rejected',
      canRetry: false,
      retryUrl: undefined,
      reasons: [],
    });
  });

  it('prefers a rejection over expected spend', () => {
    expect(
      deriveNextImmersveAction([
        expectedSpend,
        { stage: 'kyc', status: 'blocked' },
      ]).type,
    ).toBe('rejected');
  });

  it('prioritises rejected over pending', () => {
    expect(
      deriveNextImmersveAction([
        amlPending,
        { stage: 'kyc', status: 'blocked' },
      ]).type,
    ).toBe('rejected');
  });
});
