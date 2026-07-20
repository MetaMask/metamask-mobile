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
    });
  });

  it('returns expected_spend before funding', () => {
    expect(deriveNextImmersveAction([funding, expectedSpend]).type).toBe(
      'expected_spend',
    );
  });

  it('returns funding with the smart_contract_write params', () => {
    const result = deriveNextImmersveAction([funding, amlPending]);
    expect(result.type).toBe('funding');
    if (result.type === 'funding') {
      expect(result.write.method).toBe('approve');
      expect(result.write.params._spender).toBe('0xSpender');
    }
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
});
