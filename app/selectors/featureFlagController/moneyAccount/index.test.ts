import {
  selectMoneyAccountDepositEnabledFlag,
  selectMoneyAccountWithdrawEnabledFlag,
} from './index';

describe('Money Account feature flag selectors', () => {
  describe('selectMoneyAccountDepositEnabledFlag', () => {
    it('returns true when moneyAccountDepositEnabled is true', () => {
      const result = selectMoneyAccountDepositEnabledFlag.resultFunc({
        moneyAccount: {
          moneyAccountDepositEnabled: true,
          moneyAccountWithdrawEnabled: false,
        },
      });

      expect(result).toBe(true);
    });

    it('returns false when moneyAccountDepositEnabled is false', () => {
      const result = selectMoneyAccountDepositEnabledFlag.resultFunc({
        moneyAccount: {
          moneyAccountDepositEnabled: false,
        },
      });

      expect(result).toBe(false);
    });

    it('returns false when moneyAccount flag is undefined', () => {
      const result = selectMoneyAccountDepositEnabledFlag.resultFunc({});

      expect(result).toBe(false);
    });

    it('returns false when moneyAccountDepositEnabled is not set', () => {
      const result = selectMoneyAccountDepositEnabledFlag.resultFunc({
        moneyAccount: {},
      });

      expect(result).toBe(false);
    });
  });

  describe('selectMoneyAccountWithdrawEnabledFlag', () => {
    it('returns true when moneyAccountWithdrawEnabled is true', () => {
      const result = selectMoneyAccountWithdrawEnabledFlag.resultFunc({
        moneyAccount: {
          moneyAccountDepositEnabled: false,
          moneyAccountWithdrawEnabled: true,
        },
      });

      expect(result).toBe(true);
    });

    it('returns false when moneyAccountWithdrawEnabled is false', () => {
      const result = selectMoneyAccountWithdrawEnabledFlag.resultFunc({
        moneyAccount: {
          moneyAccountWithdrawEnabled: false,
        },
      });

      expect(result).toBe(false);
    });

    it('returns false when moneyAccount flag is undefined', () => {
      const result = selectMoneyAccountWithdrawEnabledFlag.resultFunc({});

      expect(result).toBe(false);
    });

    it('returns false when moneyAccountWithdrawEnabled is not set', () => {
      const result = selectMoneyAccountWithdrawEnabledFlag.resultFunc({
        moneyAccount: {},
      });

      expect(result).toBe(false);
    });
  });
});
