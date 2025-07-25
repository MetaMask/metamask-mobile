import { RootState } from '../reducers';
import { CardState } from '../reducers/card';
import {
  selectCardState,
  selectCardholderAccounts,
  selectIsCardholder,
} from './card';

const CARDHOLDER_ACCOUNTS_MOCK: string[] = [
  '0x1234567890123456789012345678901234567890',
  '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
];

const CARD_STATE_MOCK: CardState = {
  cardholderAccounts: CARDHOLDER_ACCOUNTS_MOCK,
  lastUpdated: 1642608000000,
};

const EMPTY_CARD_STATE_MOCK: CardState = {
  cardholderAccounts: [],
  lastUpdated: null,
};

describe('Card Selectors', () => {
  describe('selectCardState', () => {
    it('returns the card state from the root state', () => {
      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      expect(selectCardState(mockRootState)).toEqual(CARD_STATE_MOCK);
    });
  });

  describe('selectCardholderAccounts', () => {
    it('returns the cardholder accounts array from the card state', () => {
      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      expect(selectCardholderAccounts(mockRootState)).toEqual(
        CARDHOLDER_ACCOUNTS_MOCK,
      );
    });

    it('returns an empty array when no cardholder accounts exist', () => {
      const mockRootState = {
        card: EMPTY_CARD_STATE_MOCK,
      } as unknown as RootState;

      expect(selectCardholderAccounts(mockRootState)).toEqual([]);
    });
  });

  describe('selectIsCardholder', () => {
    it('returns true when cardholder accounts exist', () => {
      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      expect(selectIsCardholder(mockRootState)).toBe(true);
    });

    it('returns false when no cardholder accounts exist', () => {
      const mockRootState = {
        card: EMPTY_CARD_STATE_MOCK,
      } as unknown as RootState;

      expect(selectIsCardholder(mockRootState)).toBe(false);
    });
  });
});
