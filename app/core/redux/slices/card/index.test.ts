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

const testAddress = '0x1234567890123456789012345678901234567890';

const CARD_STATE_MOCK: CardSliceState = {
  cardholderAccounts: CARDHOLDER_ACCOUNTS_MOCK,
  priorityTokensByAddress: {
    [testAddress.toLowerCase()]: MOCK_PRIORITY_TOKEN,
  },
  lastFetchedByAddress: {
    [testAddress.toLowerCase()]: new Date('2025-08-21T10:00:00Z'),
  },
  isLoaded: true,
};

const EMPTY_CARD_STATE_MOCK: CardSliceState = {
  cardholderAccounts: [],
  priorityTokensByAddress: {},
  lastFetchedByAddress: {},
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
        priorityTokensByAddress: {
          '0x123': MOCK_PRIORITY_TOKEN,
        },
        lastFetchedByAddress: {
          '0x123': new Date(),
        },
        isLoaded: true,
      };

      const state = cardReducer(currentState, resetCardState());

      expect(state).toEqual(initialState);
    });
  });
});

describe('Card Caching Functionality', () => {
  describe('selectCardPriorityToken', () => {
    it('should return the priority token when it exists for the given address', () => {
      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      const selector = selectCardPriorityToken(testAddress);
      expect(selector(mockRootState)).toEqual(MOCK_PRIORITY_TOKEN);
    });

    it('should return null when no priority token exists for the given address', () => {
      const mockRootState = {
        card: EMPTY_CARD_STATE_MOCK,
      } as unknown as RootState;

      const selector = selectCardPriorityToken(testAddress);
      expect(selector(mockRootState)).toBeNull();
    });

    it('should return null when address is not provided', () => {
      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      const selector = selectCardPriorityToken();
      expect(selector(mockRootState)).toBeNull();
    });

    it('should handle different address cases', () => {
      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      // Test with uppercase address
      const upperCaseSelector = selectCardPriorityToken(
        testAddress.toUpperCase(),
      );
      expect(upperCaseSelector(mockRootState)).toEqual(MOCK_PRIORITY_TOKEN);

      // Test with different address that doesn't exist
      const differentAddressSelector = selectCardPriorityToken(
        '0x9999999999999999999999999999999999999999',
      );
      expect(differentAddressSelector(mockRootState)).toBeNull();
    });
  });

  describe('selectCardPriorityTokenLastFetched', () => {
    it('should return the last fetched timestamp when it exists for the given address', () => {
      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      const selector = selectCardPriorityTokenLastFetched(testAddress);
      expect(selector(mockRootState)).toEqual(new Date('2025-08-21T10:00:00Z'));
    });

    it('should return null when no last fetched timestamp exists for the given address', () => {
      const mockRootState = {
        card: EMPTY_CARD_STATE_MOCK,
      } as unknown as RootState;

      const selector = selectCardPriorityTokenLastFetched(testAddress);
      expect(selector(mockRootState)).toBeNull();
    });

    it('should return null when address is not provided', () => {
      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      const selector = selectCardPriorityTokenLastFetched();
      expect(selector(mockRootState)).toBeNull();
    });

    it('should handle different address cases', () => {
      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      // Test with uppercase address
      const upperCaseSelector = selectCardPriorityTokenLastFetched(
        testAddress.toUpperCase(),
      );
      expect(upperCaseSelector(mockRootState)).toEqual(
        new Date('2025-08-21T10:00:00Z'),
      );

      // Test with different address that doesn't exist
      const differentAddressSelector = selectCardPriorityTokenLastFetched(
        '0x9999999999999999999999999999999999999999',
      );
      expect(differentAddressSelector(mockRootState)).toBeNull();
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

    it('should return true when cache is within 5-minute window for the given address', () => {
      // Mock Date.now to return 4 minutes after fetch time
      dateNowSpy.mockReturnValue(new Date('2025-08-21T10:04:00Z').getTime());

      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      const selector = selectIsCardCacheValid(testAddress);
      expect(selector(mockRootState)).toBe(true);
    });

    it('should return false when cache is older than 5 minutes for the given address', () => {
      // Mock Date.now to return 6 minutes after fetch time
      dateNowSpy.mockReturnValue(new Date('2025-08-21T10:06:00Z').getTime());

      const stateWithOldCache: CardSliceState = {
        ...CARD_STATE_MOCK,
        lastFetchedByAddress: {
          [testAddress.toLowerCase()]: new Date('2025-08-21T10:00:00Z'),
        },
      };

      const mockRootState = {
        card: stateWithOldCache,
      } as unknown as RootState;

      const selector = selectIsCardCacheValid(testAddress);
      expect(selector(mockRootState)).toBe(false);
    });

    it('should return false when no last fetched timestamp exists for the given address', () => {
      // Mock Date.now to any time
      dateNowSpy.mockReturnValue(new Date('2025-08-21T10:04:00Z').getTime());

      const mockRootState = {
        card: EMPTY_CARD_STATE_MOCK,
      } as unknown as RootState;

      const selector = selectIsCardCacheValid(testAddress);
      expect(selector(mockRootState)).toBe(false);
    });

    it('should handle ISO date strings from redux-persist', () => {
      // Mock Date.now to return 4 minutes after fetch time
      dateNowSpy.mockReturnValue(new Date('2025-08-21T10:04:00Z').getTime());

      const stateWithStringDate: CardSliceState = {
        ...CARD_STATE_MOCK,
        lastFetchedByAddress: {
          [testAddress.toLowerCase()]: '2025-08-21T10:00:00Z', // String instead of Date object
        },
      };

      const mockRootState = {
        card: stateWithStringDate,
      } as unknown as RootState;

      const selector = selectIsCardCacheValid(testAddress);
      expect(selector(mockRootState)).toBe(true);
    });

    it('should return false when address is not provided', () => {
      // Mock Date.now to return 4 minutes after fetch time
      dateNowSpy.mockReturnValue(new Date('2025-08-21T10:04:00Z').getTime());

      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      const selector = selectIsCardCacheValid();
      expect(selector(mockRootState)).toBe(false);
    });

    it('should return false for cache exactly 5 minutes old', () => {
      // Mock Date.now to return exactly 5 minutes after fetch time
      dateNowSpy.mockReturnValue(new Date('2025-08-21T10:05:00Z').getTime());

      const stateWithExactlyOldCache: CardSliceState = {
        ...CARD_STATE_MOCK,
        lastFetchedByAddress: {
          [testAddress.toLowerCase()]: new Date('2025-08-21T10:00:00Z'),
        },
      };

      const mockRootState = {
        card: stateWithExactlyOldCache,
      } as unknown as RootState;

      const selector = selectIsCardCacheValid(testAddress);
      expect(selector(mockRootState)).toBe(false);
    });

    it('should return true for cache 4 minutes and 59 seconds old', () => {
      // Mock Date.now to return 4:59 after fetch time (still valid)
      dateNowSpy.mockReturnValue(new Date('2025-08-21T10:04:59Z').getTime());

      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      const selector = selectIsCardCacheValid(testAddress);
      expect(selector(mockRootState)).toBe(true);
    });
  });

  describe('setCardPriorityToken', () => {
    it('should set the priority token for the given address', () => {
      const state = cardReducer(
        initialState,
        setCardPriorityToken({
          address: testAddress,
          token: MOCK_PRIORITY_TOKEN,
        }),
      );

      expect(state.priorityTokensByAddress[testAddress.toLowerCase()]).toEqual(
        MOCK_PRIORITY_TOKEN,
      );
      expect(state.lastFetchedByAddress).toEqual(
        initialState.lastFetchedByAddress,
      );
    });

    it('should set priority token to null for the given address', () => {
      const stateWithToken = {
        ...initialState,
        priorityTokensByAddress: {
          [testAddress.toLowerCase()]: MOCK_PRIORITY_TOKEN,
        },
      };

      const state = cardReducer(
        stateWithToken,
        setCardPriorityToken({
          address: testAddress,
          token: null,
        }),
      );

      expect(
        state.priorityTokensByAddress[testAddress.toLowerCase()],
      ).toBeNull();
    });

    it('should update existing priority token for the given address', () => {
      const newToken: CardTokenAllowance = {
        ...MOCK_PRIORITY_TOKEN,
        symbol: 'UPDATED',
      };

      const stateWithToken = {
        ...initialState,
        priorityTokensByAddress: {
          [testAddress.toLowerCase()]: MOCK_PRIORITY_TOKEN,
        },
      };

      const state = cardReducer(
        stateWithToken,
        setCardPriorityToken({
          address: testAddress,
          token: newToken,
        }),
      );

      expect(state.priorityTokensByAddress[testAddress.toLowerCase()]).toEqual(
        newToken,
      );
    });

    it('should store tokens for different addresses separately', () => {
      const address1 = testAddress;
      const address2 = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      const token2: CardTokenAllowance = {
        ...MOCK_PRIORITY_TOKEN,
        symbol: 'TOKEN2',
      };

      let state = cardReducer(
        initialState,
        setCardPriorityToken({
          address: address1,
          token: MOCK_PRIORITY_TOKEN,
        }),
      );

      state = cardReducer(
        state,
        setCardPriorityToken({
          address: address2,
          token: token2,
        }),
      );

      expect(state.priorityTokensByAddress[address1.toLowerCase()]).toEqual(
        MOCK_PRIORITY_TOKEN,
      );
      expect(state.priorityTokensByAddress[address2.toLowerCase()]).toEqual(
        token2,
      );
    });

    it('should normalize address to lowercase', () => {
      const upperCaseAddress = testAddress.toUpperCase();

      const state = cardReducer(
        initialState,
        setCardPriorityToken({
          address: upperCaseAddress,
          token: MOCK_PRIORITY_TOKEN,
        }),
      );

      expect(state.priorityTokensByAddress[testAddress.toLowerCase()]).toEqual(
        MOCK_PRIORITY_TOKEN,
      );
      expect(state.priorityTokensByAddress[upperCaseAddress]).toBeUndefined();
    });
  });

  describe('setCardPriorityTokenLastFetched', () => {
    it('should set the last fetched timestamp for the given address', () => {
      const testDate = new Date('2025-08-21T10:00:00Z');

      const state = cardReducer(
        initialState,
        setCardPriorityTokenLastFetched({
          address: testAddress,
          lastFetched: testDate,
        }),
      );

      expect(state.lastFetchedByAddress[testAddress.toLowerCase()]).toEqual(
        testDate,
      );
      expect(state.priorityTokensByAddress).toEqual(
        initialState.priorityTokensByAddress,
      );
    });

    it('should handle ISO date strings', () => {
      const testDateString = '2025-08-21T10:00:00Z';

      const state = cardReducer(
        initialState,
        setCardPriorityTokenLastFetched({
          address: testAddress,
          lastFetched: testDateString,
        }),
      );

      expect(state.lastFetchedByAddress[testAddress.toLowerCase()]).toEqual(
        testDateString,
      );
    });

    it('should store last fetched timestamps for different addresses separately', () => {
      const address1 = testAddress;
      const address2 = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
      const date1 = new Date('2025-08-21T10:00:00Z');
      const date2 = new Date('2025-08-21T11:00:00Z');

      let state = cardReducer(
        initialState,
        setCardPriorityTokenLastFetched({
          address: address1,
          lastFetched: date1,
        }),
      );

      state = cardReducer(
        state,
        setCardPriorityTokenLastFetched({
          address: address2,
          lastFetched: date2,
        }),
      );

      expect(state.lastFetchedByAddress[address1.toLowerCase()]).toEqual(date1);
      expect(state.lastFetchedByAddress[address2.toLowerCase()]).toEqual(date2);
    });

    it('should normalize address to lowercase', () => {
      const upperCaseAddress = testAddress.toUpperCase();
      const testDate = new Date('2025-08-21T10:00:00Z');

      const state = cardReducer(
        initialState,
        setCardPriorityTokenLastFetched({
          address: upperCaseAddress,
          lastFetched: testDate,
        }),
      );

      expect(state.lastFetchedByAddress[testAddress.toLowerCase()]).toEqual(
        testDate,
      );
      expect(state.lastFetchedByAddress[upperCaseAddress]).toBeUndefined();
    });

    it('should set lastFetched to null for the given address', () => {
      const stateWithTimestamp = {
        ...initialState,
        lastFetchedByAddress: {
          [testAddress.toLowerCase()]: new Date(),
        },
      };

      const state = cardReducer(
        stateWithTimestamp,
        setCardPriorityTokenLastFetched({
          address: testAddress,
          lastFetched: null,
        }),
      );

      expect(state.lastFetchedByAddress[testAddress.toLowerCase()]).toBeNull();
    });

    it('should overwrite existing timestamp for the given address', () => {
      const oldTimestamp = new Date('2025-08-21T10:00:00Z');
      const newTimestamp = new Date('2025-08-21T11:00:00Z');

      const stateWithTimestamp = {
        ...initialState,
        lastFetchedByAddress: {
          [testAddress.toLowerCase()]: oldTimestamp,
        },
      };

      const state = cardReducer(
        stateWithTimestamp,
        setCardPriorityTokenLastFetched({
          address: testAddress,
          lastFetched: newTimestamp,
        }),
      );

      expect(state.lastFetchedByAddress[testAddress.toLowerCase()]).toEqual(
        newTimestamp,
      );
    });
  });
});
