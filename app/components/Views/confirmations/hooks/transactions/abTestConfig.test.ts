import { createActiveABTestAssignment } from '../../../../../util/analytics/activeABTestAssignments';
import {
  getMoneyAccountDepositPrefillTransactionActiveAbTests,
  MONEY_ACCOUNT_DEPOSIT_PREFILL_AB_KEY,
} from './abTestConfig';

describe('getMoneyAccountDepositPrefillTransactionActiveAbTests', () => {
  it('returns undefined when assignment is inactive', () => {
    expect(
      getMoneyAccountDepositPrefillTransactionActiveAbTests(false, 'treatment'),
    ).toBeUndefined();
  });

  it('returns a normalized assignment when active', () => {
    expect(
      getMoneyAccountDepositPrefillTransactionActiveAbTests(true, 'control'),
    ).toEqual([
      createActiveABTestAssignment(
        MONEY_ACCOUNT_DEPOSIT_PREFILL_AB_KEY,
        'control',
      ),
    ]);
  });
});
