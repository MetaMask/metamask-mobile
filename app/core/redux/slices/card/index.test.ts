import { RootState } from '../../../../reducers';
import {
  CardSliceState,
  selectCardholderAccounts,
  selectIsCardholder,
  selectIsCardDataLoaded,
  selectCardLoading,
  selectCardError,
} from '.';

const CARDHOLDER_ACCOUNTS_MOCK: string[] = [
  '0x1234567890123456789012345678901234567890',
  '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
];

const CARD_STATE_MOCK: CardSliceState = {
  cardholderAccounts: CARDHOLDER_ACCOUNTS_MOCK,
  lastUpdated: 1642608000000,
  isLoading: false,
  error: null,
  isLoaded: true,
};

const EMPTY_CARD_STATE_MOCK: CardSliceState = {
  cardholderAccounts: [],
  lastUpdated: null,
  isLoading: false,
  error: null,
  isLoaded: false,
};

const LOADING_CARD_STATE_MOCK: CardSliceState = {
  cardholderAccounts: [],
  lastUpdated: null,
  isLoading: true,
  error: null,
  isLoaded: false,
};

const ERROR_CARD_STATE_MOCK: CardSliceState = {
  cardholderAccounts: [],
  lastUpdated: null,
  isLoading: false,
  error: 'Failed to load cardholder accounts',
  isLoaded: true,
};

describe('Card Selectors', () => {
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

  describe('selectIsCardDataLoaded', () => {
    it('returns true when card data is loaded', () => {
      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      expect(selectIsCardDataLoaded(mockRootState)).toBe(true);
    });

    it('returns false when card data is not loaded', () => {
      const mockRootState = {
        card: EMPTY_CARD_STATE_MOCK,
      } as unknown as RootState;

      expect(selectIsCardDataLoaded(mockRootState)).toBe(false);
    });
  });

  describe('selectCardLoading', () => {
    it('returns true when card is loading', () => {
      const mockRootState = {
        card: LOADING_CARD_STATE_MOCK,
      } as unknown as RootState;

      expect(selectCardLoading(mockRootState)).toBe(true);
    });

    it('returns false when card is not loading', () => {
      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      expect(selectCardLoading(mockRootState)).toBe(false);
    });
  });

  describe('selectCardError', () => {
    it('returns error message when there is an error', () => {
      const mockRootState = {
        card: ERROR_CARD_STATE_MOCK,
      } as unknown as RootState;

      expect(selectCardError(mockRootState)).toBe(
        'Failed to load cardholder accounts',
      );
    });

    it('returns null when there is no error', () => {
      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      expect(selectCardError(mockRootState)).toBe(null);
    });
  });
});
