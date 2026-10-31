import type { MoneyAccount } from '@metamask/money-account-controller';
import type { RootState } from '../../reducers';
import {
  selectPrimaryMoneyAccountUpgradeRecord,
  selectUpgradedMoneyAccounts,
} from './index';

const MOCK_RECORD = { configFingerprint: 'abc', completedAt: 1700000000000 };

describe('MoneyAccountUpgradeController selectors', () => {
  describe('selectUpgradedMoneyAccounts', () => {
    it('returns the upgradedAccounts record', () => {
      const state = {
        engine: {
          backgroundState: {
            MoneyAccountUpgradeController: {
              upgradedAccounts: { '0xabc': MOCK_RECORD },
            },
          },
        },
      } as unknown as RootState;

      const result = selectUpgradedMoneyAccounts(state);

      expect(result).toEqual({ '0xabc': MOCK_RECORD });
    });
  });

  describe('selectPrimaryMoneyAccountUpgradeRecord', () => {
    it('matches the primary money account address case-insensitively', () => {
      const result = selectPrimaryMoneyAccountUpgradeRecord.resultFunc(
        { '0xabcdef': MOCK_RECORD },
        { address: '0xABCDEF' } as MoneyAccount,
      );

      expect(result).toEqual(MOCK_RECORD);
    });

    it('returns undefined when the primary money account has no record', () => {
      const result = selectPrimaryMoneyAccountUpgradeRecord.resultFunc(
        { '0x123': MOCK_RECORD },
        { address: '0xabcdef' } as MoneyAccount,
      );

      expect(result).toBeUndefined();
    });

    it('returns undefined when there is no primary money account', () => {
      const result = selectPrimaryMoneyAccountUpgradeRecord.resultFunc(
        { '0xabcdef': MOCK_RECORD },
        undefined,
      );

      expect(result).toBeUndefined();
    });
  });
});
