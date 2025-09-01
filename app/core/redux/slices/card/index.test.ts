import { RootState } from '../../../../reducers';
import cardReducer, {
  CardSliceState,
  selectCardholderAccounts,
  selectIsCardholder,
  selectCardPriorityToken,
  selectCardPriorityTokenLastFetched,
  selectIsCardCacheValid,
  loadCardholderAccounts,
  resetCardState,
  setCardPriorityToken,
  setCardPriorityTokenLastFetched,
  initialState,
} from '.';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import {
  CardTokenAllowance,
  AllowanceState,
} from '../../../../components/UI/Card/types';
import { ethers } from 'ethers';

// Mock the accountsController selectors
jest.mock('../../../../selectors/accountsController', () => ({
  selectSelectedInternalAccountFormattedAddress: jest.fn(),
}));

const mockSelectSelectedInternalAccountFormattedAddress =
  selectSelectedInternalAccountFormattedAddress as jest.MockedFunction<
    typeof selectSelectedInternalAccountFormattedAddress
  >;

const CARDHOLDER_ACCOUNTS_MOCK: string[] = [
  '0x1234567890123456789012345678901234567890',
  '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
];

const MOCK_PRIORITY_TOKEN: CardTokenAllowance = {
  address: '0xToken1',
  chainId: '1',
  isStaked: false,
  decimals: 18,
  symbol: 'USDC',
  name: 'USD Coin',
  allowanceState: AllowanceState.Enabled,
  allowance: ethers.BigNumber.from('500000000000000000'),
};

const CARD_STATE_MOCK: CardSliceState = {
  cardholderAccounts: CARDHOLDER_ACCOUNTS_MOCK,
  priorityToken: MOCK_PRIORITY_TOKEN,
  lastFetched: new Date('2025-08-21T10:00:00Z'),
  isLoaded: true,
};

const EMPTY_CARD_STATE_MOCK: CardSliceState = {
  cardholderAccounts: [],
  priorityToken: null,
  lastFetched: null,
  isLoaded: false,
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
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns true when selected account is in cardholder accounts', () => {
      const selectedAccount = CARDHOLDER_ACCOUNTS_MOCK[0];
      mockSelectSelectedInternalAccountFormattedAddress.mockReturnValue(
        selectedAccount,
      );

      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      expect(selectIsCardholder(mockRootState)).toBe(true);
    });

    it('returns false when selected account is not in cardholder accounts', () => {
      const selectedAccount = '0x9999999999999999999999999999999999999999';
      mockSelectSelectedInternalAccountFormattedAddress.mockReturnValue(
        selectedAccount,
      );

      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      expect(selectIsCardholder(mockRootState)).toBe(false);
    });

    it('returns false when no account is selected', () => {
      mockSelectSelectedInternalAccountFormattedAddress.mockReturnValue(
        undefined,
      );

      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      expect(selectIsCardholder(mockRootState)).toBe(false);
    });

    it('returns false when no cardholder accounts exist', () => {
      const selectedAccount = '0x1234567890123456789012345678901234567890';
      mockSelectSelectedInternalAccountFormattedAddress.mockReturnValue(
        selectedAccount,
      );

      const mockRootState = {
        card: EMPTY_CARD_STATE_MOCK,
      } as unknown as RootState;

      expect(selectIsCardholder(mockRootState)).toBe(false);
    });
  });
});

describe('Card Reducer', () => {
  describe('extraReducers', () => {
    describe('loadCardholderAccounts', () => {
      it('should set cardholder accounts and update state when fulfilled', () => {
        const mockAccounts = ['0x123', '0x456'];
        const action = {
          type: loadCardholderAccounts.fulfilled.type,
          payload: mockAccounts,
        };
        const state = cardReducer(initialState, action);

        expect(state.cardholderAccounts).toEqual(mockAccounts);
        expect(state.isLoaded).toBe(true);
      });

      it('should handle empty payload when fulfilled', () => {
        const action = {
          type: loadCardholderAccounts.fulfilled.type,
          payload: null,
        };
        const state = cardReducer(initialState, action);

        expect(state.cardholderAccounts).toEqual([]);
        expect(state.isLoaded).toBe(true);
      });

      it('should set isLoaded to true when rejected', () => {
        const errorMessage = 'Failed to load accounts';
        const action = {
          type: loadCardholderAccounts.rejected.type,
          error: {
            message: errorMessage,
          },
        };
        const state = cardReducer(initialState, action);

        expect(state.isLoaded).toBe(true);
        expect(state.cardholderAccounts).toEqual([]); // Should remain empty on error
      });
    });
  });

  describe('reducers', () => {
    it('should reset card state', () => {
      const currentState: CardSliceState = {
        cardholderAccounts: ['0x123'],
        priorityToken: MOCK_PRIORITY_TOKEN,
        lastFetched: new Date(),
        isLoaded: true,
      };

      const state = cardReducer(currentState, resetCardState());

      expect(state).toEqual(initialState);
    });
  });
});

describe('Card Caching Functionality', () => {
  describe('selectCardPriorityToken', () => {
    it('should return the priority token when it exists', () => {
      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      expect(selectCardPriorityToken(mockRootState)).toEqual(
        MOCK_PRIORITY_TOKEN,
      );
    });

    it('should return null when no priority token exists', () => {
      const mockRootState = {
        card: EMPTY_CARD_STATE_MOCK,
      } as unknown as RootState;

      expect(selectCardPriorityToken(mockRootState)).toBeNull();
    });
  });

  describe('selectCardPriorityTokenLastFetched', () => {
    it('should return the last fetched timestamp when it exists', () => {
      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      expect(selectCardPriorityTokenLastFetched(mockRootState)).toEqual(
        new Date('2025-08-21T10:00:00Z'),
      );
    });

    it('should return null when no last fetched timestamp exists', () => {
      const mockRootState = {
        card: EMPTY_CARD_STATE_MOCK,
      } as unknown as RootState;

      expect(selectCardPriorityTokenLastFetched(mockRootState)).toBeNull();
    });
  });

  describe('selectIsCardCacheValid', () => {
    let dateNowSpy: jest.SpyInstance;

    beforeEach(() => {
      dateNowSpy = jest.spyOn(Date, 'now');
    });

    afterEach(() => {
      dateNowSpy.mockRestore();
    });

    it('should return true when cache is within 5-minute window', () => {
      // Mock Date.now to return 4 minutes after fetch time
      dateNowSpy.mockReturnValue(new Date('2025-08-21T10:04:00Z').getTime());

      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      expect(selectIsCardCacheValid(mockRootState)).toBe(true);
    });

    it('should return false when cache is older than 5 minutes', () => {
      // Mock Date.now to return 6 minutes after fetch time
      dateNowSpy.mockReturnValue(new Date('2025-08-21T10:06:00Z').getTime());

      // Use a different state object to avoid selector memoization
      const stateWithOldCache: CardSliceState = {
        ...CARD_STATE_MOCK,
        lastFetched: new Date('2025-08-21T10:00:00Z'), // Same time but different object
      };

      const mockRootState = {
        card: stateWithOldCache,
      } as unknown as RootState;

      expect(selectIsCardCacheValid(mockRootState)).toBe(false);
    });

    it('should return false when no last fetched timestamp exists', () => {
      // Mock Date.now to any time
      dateNowSpy.mockReturnValue(new Date('2025-08-21T10:04:00Z').getTime());

      const mockRootState = {
        card: EMPTY_CARD_STATE_MOCK,
      } as unknown as RootState;

      expect(selectIsCardCacheValid(mockRootState)).toBe(false);
    });

    it('should handle ISO date strings from redux-persist', () => {
      // Mock Date.now to return 4 minutes after fetch time
      dateNowSpy.mockReturnValue(new Date('2025-08-21T10:04:00Z').getTime());

      const stateWithStringDate: CardSliceState = {
        ...CARD_STATE_MOCK,
        lastFetched: '2025-08-21T10:00:00Z', // String instead of Date object
      };

      const mockRootState = {
        card: stateWithStringDate,
      } as unknown as RootState;

      expect(selectIsCardCacheValid(mockRootState)).toBe(true);
    });

    it('should return false for cache exactly 5 minutes old', () => {
      // Mock Date.now to return exactly 5 minutes after fetch time
      dateNowSpy.mockReturnValue(new Date('2025-08-21T10:05:00Z').getTime());

      // Use a different state object to avoid selector memoization
      const stateWithExactlyOldCache: CardSliceState = {
        ...CARD_STATE_MOCK,
        lastFetched: new Date('2025-08-21T10:00:00Z'), // Same time but different object
      };

      const mockRootState = {
        card: stateWithExactlyOldCache,
      } as unknown as RootState;

      expect(selectIsCardCacheValid(mockRootState)).toBe(false);
    });

    it('should return true for cache 4 minutes and 59 seconds old', () => {
      // Mock Date.now to return 4:59 after fetch time (still valid)
      dateNowSpy.mockReturnValue(new Date('2025-08-21T10:04:59Z').getTime());

      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      expect(selectIsCardCacheValid(mockRootState)).toBe(true);
    });
  });
  describe('setCardPriorityToken action', () => {
    it('should set the priority token', () => {
      const state = cardReducer(
        initialState,
        setCardPriorityToken(MOCK_PRIORITY_TOKEN),
      );

      expect(state.priorityToken).toEqual(MOCK_PRIORITY_TOKEN);
      expect(state.cardholderAccounts).toEqual(initialState.cardholderAccounts);
      expect(state.lastFetched).toEqual(initialState.lastFetched);
      expect(state.isLoaded).toEqual(initialState.isLoaded);
    });

    it('should clear the priority token when set to null', () => {
      const stateWithToken = {
        ...initialState,
        priorityToken: MOCK_PRIORITY_TOKEN,
      };

      const state = cardReducer(stateWithToken, setCardPriorityToken(null));

      expect(state.priorityToken).toBeNull();
    });

    it('should overwrite existing priority token', () => {
      const newToken: CardTokenAllowance = {
        ...MOCK_PRIORITY_TOKEN,
        symbol: 'USDT',
        name: 'Tether',
      };

      const stateWithToken = {
        ...initialState,
        priorityToken: MOCK_PRIORITY_TOKEN,
      };

      const state = cardReducer(stateWithToken, setCardPriorityToken(newToken));

      expect(state.priorityToken).toEqual(newToken);
    });
  });

  describe('setCardPriorityTokenLastFetched action', () => {
    it('should set the last fetched timestamp with Date object', () => {
      const timestamp = new Date('2025-08-21T12:00:00Z');
      const state = cardReducer(
        initialState,
        setCardPriorityTokenLastFetched(timestamp),
      );

      expect(state.lastFetched).toEqual(timestamp);
      expect(state.cardholderAccounts).toEqual(initialState.cardholderAccounts);
      expect(state.priorityToken).toEqual(initialState.priorityToken);
      expect(state.isLoaded).toEqual(initialState.isLoaded);
    });

    it('should set the last fetched timestamp with ISO string', () => {
      const timestamp = '2025-08-21T12:00:00Z';
      const state = cardReducer(
        initialState,
        setCardPriorityTokenLastFetched(timestamp),
      );

      expect(state.lastFetched).toEqual(timestamp);
    });

    it('should clear the last fetched timestamp when set to null', () => {
      const stateWithTimestamp = {
        ...initialState,
        lastFetched: new Date(),
      };

      const state = cardReducer(
        stateWithTimestamp,
        setCardPriorityTokenLastFetched(null),
      );

      expect(state.lastFetched).toBeNull();
    });

    it('should overwrite existing timestamp', () => {
      const oldTimestamp = new Date('2025-08-21T10:00:00Z');
      const newTimestamp = new Date('2025-08-21T11:00:00Z');

      const stateWithTimestamp = {
        ...initialState,
        lastFetched: oldTimestamp,
      };

      const state = cardReducer(
        stateWithTimestamp,
        setCardPriorityTokenLastFetched(newTimestamp),
      );

      expect(state.lastFetched).toEqual(newTimestamp);
    });
  });
});
