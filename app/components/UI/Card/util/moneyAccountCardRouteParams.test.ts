import {
  MONEY_ACCOUNT_CARD_SOURCE,
  WALLET_CARD_SOURCE,
  isMoneyAccountCardSource,
} from './moneyAccountCardRouteParams';

describe('moneyAccountCardRouteParams', () => {
  describe('constants', () => {
    it('exports the canonical MA source string', () => {
      expect(MONEY_ACCOUNT_CARD_SOURCE).toBe('moneyAccount');
    });

    it('exports the canonical wallet source string', () => {
      expect(WALLET_CARD_SOURCE).toBe('wallet');
    });
  });

  describe('isMoneyAccountCardSource', () => {
    it('returns true for the MA source value', () => {
      expect(isMoneyAccountCardSource(MONEY_ACCOUNT_CARD_SOURCE)).toBe(true);
    });

    it('returns false for the wallet source value', () => {
      expect(isMoneyAccountCardSource(WALLET_CARD_SOURCE)).toBe(false);
    });

    it('returns false for undefined (default wallet behaviour)', () => {
      expect(isMoneyAccountCardSource(undefined)).toBe(false);
    });
  });
});
