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
  setHasViewedCardButton,
  selectHasViewedCardButton,
  selectCardGeoLocation,
  selectDisplayCardButton,
  selectAlwaysShowCardButton,
  setAlwaysShowCardButton,
} from '.';
import {
  CardTokenAllowance,
  AllowanceState,
} from '../../../../components/UI/Card/types';
import { ethers } from 'ethers';

// Mock the multichain selectors
jest.mock('../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: jest.fn(),
}));

// Mock the multichain utils
jest.mock('../../../Multichain/utils', () => ({
  isEthAccount: jest.fn(),
}));

// Mock feature flag selectors
jest.mock('../../../../selectors/featureFlagController/card', () => ({
  selectCardExperimentalSwitch: jest.fn(),
  selectCardSupportedCountries: jest.fn(),
  selectDisplayCardButtonFeatureFlag: jest.fn(),
}));

import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { isEthAccount } from '../../../Multichain/utils';
import {
  selectCardExperimentalSwitch,
  selectCardSupportedCountries,
  selectDisplayCardButtonFeatureFlag,
} from '../../../../selectors/featureFlagController/card';

const mockSelectSelectedInternalAccountByScope =
  selectSelectedInternalAccountByScope as jest.MockedFunction<
    typeof selectSelectedInternalAccountByScope
  >;

const mockIsEthAccount = isEthAccount as jest.MockedFunction<
  typeof isEthAccount
>;

const mockSelectCardExperimentalSwitch =
  selectCardExperimentalSwitch as jest.MockedFunction<
    typeof selectCardExperimentalSwitch
  >;

const mockSelectCardSupportedCountries =
  selectCardSupportedCountries as jest.MockedFunction<
    typeof selectCardSupportedCountries
  >;

const mockSelectDisplayCardButtonFeatureFlag =
  selectDisplayCardButtonFeatureFlag as jest.MockedFunction<
    typeof selectDisplayCardButtonFeatureFlag
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
  hasViewedCardButton: true,
  alwaysShowCardButton: false,
  geoLocation: 'US',
  isAuthenticated: false,
};

const EMPTY_CARD_STATE_MOCK: CardSliceState = {
  cardholderAccounts: [],
  priorityTokensByAddress: {},
  lastFetchedByAddress: {},
  isLoaded: false,
  hasViewedCardButton: false,
  alwaysShowCardButton: false,
  geoLocation: 'UNKNOWN',
  isAuthenticated: false,
};

// Mock account object that matches the expected structure
const createMockAccount = (address: string) => ({
  address: address.toLowerCase(),
  id: `mock-id-${address}`,
  metadata: {
    name: 'Mock Account',
    importTime: Date.now(),
    keyring: {
      type: 'HD Key Tree',
    },
  },
  options: {},
  methods: [],
  type: 'eip155:eoa' as const,
  scopes: ['eip155:59144' as const],
});

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

  describe('selectHasViewedCardButton', () => {
    it('returns false by default from initial state', () => {
      const mockRootState = { card: initialState } as unknown as RootState;
      expect(selectHasViewedCardButton(mockRootState)).toBe(false);
    });

    it('returns true when hasViewedCardButton is true', () => {
      const stateWithFlag: CardSliceState = {
        ...initialState,
        hasViewedCardButton: true,
      };
      const mockRootState = { card: stateWithFlag } as unknown as RootState;
      expect(selectHasViewedCardButton(mockRootState)).toBe(true);
    });
  });

  describe('selectCardGeoLocation', () => {
    it('returns UNKNOWN by default from initial state', () => {
      const mockRootState = { card: initialState } as unknown as RootState;
      expect(selectCardGeoLocation(mockRootState)).toBe('UNKNOWN');
    });

    it('returns the geolocation from the card state', () => {
      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;
      expect(selectCardGeoLocation(mockRootState)).toBe('US');
    });

    it('returns different geolocation values correctly', () => {
      const geoLocations = ['US', 'GB', 'CA', 'DE', 'FR', 'UNKNOWN'];

      geoLocations.forEach((geoLocation) => {
        const stateWithGeoLocation: CardSliceState = {
          ...initialState,
          geoLocation,
        };
        const mockRootState = {
          card: stateWithGeoLocation,
        } as unknown as RootState;
        expect(selectCardGeoLocation(mockRootState)).toBe(geoLocation);
      });
    });
  });

  describe('selectIsCardholder', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('returns true when selected account is in cardholder accounts', () => {
      const selectedAccount = createMockAccount(CARDHOLDER_ACCOUNTS_MOCK[0]);

      // Mock the selector to return a function that returns the account
      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        () => selectedAccount,
      );
      mockIsEthAccount.mockReturnValue(true);

      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      expect(selectIsCardholder(mockRootState)).toBe(true);
    });

    it('returns false when selected account is not in cardholder accounts', () => {
      const selectedAccount = createMockAccount(
        '0x9999999999999999999999999999999999999999',
      );

      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        () => selectedAccount,
      );
      mockIsEthAccount.mockReturnValue(true);

      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      expect(selectIsCardholder(mockRootState)).toBe(false);
    });

    it('returns false when no account is selected', () => {
      mockSelectSelectedInternalAccountByScope.mockReturnValue(() => undefined);
      mockIsEthAccount.mockReturnValue(false);

      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      expect(selectIsCardholder(mockRootState)).toBe(false);
    });

    it('returns false when selected account is not an ETH account', () => {
      const selectedAccount = createMockAccount(CARDHOLDER_ACCOUNTS_MOCK[0]);

      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        () => selectedAccount,
      );
      mockIsEthAccount.mockReturnValue(false);

      const mockRootState = {
        card: CARD_STATE_MOCK,
      } as unknown as RootState;

      expect(selectIsCardholder(mockRootState)).toBe(false);
    });

    it('returns false when no cardholder accounts exist', () => {
      const selectedAccount = createMockAccount(
        '0x1234567890123456789012345678901234567890',
      );

      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        () => selectedAccount,
      );
      mockIsEthAccount.mockReturnValue(true);

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
      it('should set cardholder accounts, geolocation, and update state when fulfilled', () => {
        const mockPayload = {
          cardholderAddresses: ['0x123', '0x456'],
          geoLocation: 'US',
        };
        const action = {
          type: loadCardholderAccounts.fulfilled.type,
          payload: mockPayload,
        };
        const state = cardReducer(initialState, action);

        expect(state.cardholderAccounts).toEqual(['0x123', '0x456']);
        expect(state.geoLocation).toBe('US');
        expect(state.isLoaded).toBe(true);
      });

      it('should handle empty cardholderAddresses in payload when fulfilled', () => {
        const mockPayload = {
          cardholderAddresses: [],
          geoLocation: 'GB',
        };
        const action = {
          type: loadCardholderAccounts.fulfilled.type,
          payload: mockPayload,
        };
        const state = cardReducer(initialState, action);

        expect(state.cardholderAccounts).toEqual([]);
        expect(state.geoLocation).toBe('GB');
        expect(state.isLoaded).toBe(true);
      });

      it('should handle null cardholderAddresses and fallback to UNKNOWN geolocation', () => {
        const mockPayload = {
          cardholderAddresses: null,
          geoLocation: null,
        };
        const action = {
          type: loadCardholderAccounts.fulfilled.type,
          payload: mockPayload,
        };
        const state = cardReducer(initialState, action);

        expect(state.cardholderAccounts).toEqual([]);
        expect(state.geoLocation).toBe('UNKNOWN');
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
        expect(state.geoLocation).toBe('UNKNOWN'); // Should remain UNKNOWN on error
      });

      it('should handle different geolocation values', () => {
        const geoLocations = ['US', 'GB', 'CA', 'DE', 'FR', 'UNKNOWN'];

        geoLocations.forEach((geoLocation) => {
          const mockPayload = {
            cardholderAddresses: ['0x123'],
            geoLocation,
          };
          const action = {
            type: loadCardholderAccounts.fulfilled.type,
            payload: mockPayload,
          };
          const state = cardReducer(initialState, action);

          expect(state.geoLocation).toBe(geoLocation);
        });
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
        hasViewedCardButton: true,
        alwaysShowCardButton: true,
        geoLocation: 'US',
        isAuthenticated: false,
      };

      const state = cardReducer(currentState, resetCardState());

      expect(state).toEqual(initialState);
      expect(state.geoLocation).toBe('UNKNOWN');
      expect(state.alwaysShowCardButton).toBe(false);
    });

    describe('setHasViewedCardButton', () => {
      it('should set hasViewedCardButton to true', () => {
        const state = cardReducer(initialState, setHasViewedCardButton(true));
        expect(state.hasViewedCardButton).toBe(true);
        // ensure other parts of state untouched
        expect(state.cardholderAccounts).toEqual(
          initialState.cardholderAccounts,
        );
      });

      it('should set hasViewedCardButton to false when previously true', () => {
        const current: CardSliceState = {
          ...initialState,
          hasViewedCardButton: true,
        };
        const state = cardReducer(current, setHasViewedCardButton(false));
        expect(state.hasViewedCardButton).toBe(false);
      });
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

describe('Card Button Display Selectors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('selectAlwaysShowCardButton', () => {
    it('should return false when experimental switch is disabled', () => {
      mockSelectCardExperimentalSwitch.mockReturnValue(false);

      const stateWithAlwaysShow: CardSliceState = {
        ...initialState,
        alwaysShowCardButton: true,
      };

      const mockRootState = {
        card: stateWithAlwaysShow,
      } as unknown as RootState;

      expect(selectAlwaysShowCardButton(mockRootState)).toBe(false);
    });

    it('should return stored value when experimental switch is enabled', () => {
      mockSelectCardExperimentalSwitch.mockReturnValue(true);

      const stateWithAlwaysShow: CardSliceState = {
        ...initialState,
        alwaysShowCardButton: true,
      };

      const mockRootState = {
        card: stateWithAlwaysShow,
      } as unknown as RootState;

      expect(selectAlwaysShowCardButton(mockRootState)).toBe(true);
    });

    it('should return false when experimental switch is enabled but stored value is false', () => {
      mockSelectCardExperimentalSwitch.mockReturnValue(true);

      const stateWithoutAlwaysShow: CardSliceState = {
        ...initialState,
        alwaysShowCardButton: false,
      };

      const mockRootState = {
        card: stateWithoutAlwaysShow,
      } as unknown as RootState;

      expect(selectAlwaysShowCardButton(mockRootState)).toBe(false);
    });

    it('should return false by default with initial state', () => {
      mockSelectCardExperimentalSwitch.mockReturnValue(false);

      const mockRootState = {
        card: initialState,
      } as unknown as RootState;

      expect(selectAlwaysShowCardButton(mockRootState)).toBe(false);
    });
  });

  describe('setAlwaysShowCardButton', () => {
    it('should set alwaysShowCardButton to true', () => {
      const state = cardReducer(initialState, setAlwaysShowCardButton(true));
      expect(state.alwaysShowCardButton).toBe(true);
    });

    it('should set alwaysShowCardButton to false', () => {
      const currentState: CardSliceState = {
        ...initialState,
        alwaysShowCardButton: true,
      };

      const state = cardReducer(currentState, setAlwaysShowCardButton(false));
      expect(state.alwaysShowCardButton).toBe(false);
    });

    it('should not affect other state properties', () => {
      const state = cardReducer(initialState, setAlwaysShowCardButton(true));
      expect(state.cardholderAccounts).toEqual(initialState.cardholderAccounts);
      expect(state.geoLocation).toEqual(initialState.geoLocation);
      expect(state.isLoaded).toEqual(initialState.isLoaded);
    });
  });

  describe('selectDisplayCardButton', () => {
    const mockAccountAddress = '0x1234567890123456789012345678901234567890';
    const mockAccount = {
      address: mockAccountAddress.toLowerCase(),
      id: 'mock-id',
      metadata: {
        name: 'Mock Account',
        importTime: Date.now(),
        keyring: { type: 'HD Key Tree' },
      },
      options: {},
      methods: [],
      type: 'eip155:eoa' as const,
      scopes: ['eip155:59144' as const],
    };

    beforeEach(() => {
      // Reset all mocks to default false/empty values
      mockSelectCardExperimentalSwitch.mockReturnValue(false);
      mockSelectCardSupportedCountries.mockReturnValue({});
      mockSelectDisplayCardButtonFeatureFlag.mockReturnValue(false);
      mockSelectSelectedInternalAccountByScope.mockReturnValue(() => undefined);
      mockIsEthAccount.mockReturnValue(false);
    });

    it('should return true when alwaysShowCardButton is true', () => {
      mockSelectCardExperimentalSwitch.mockReturnValue(true);

      const stateWithAlwaysShow: CardSliceState = {
        ...initialState,
        alwaysShowCardButton: true,
        geoLocation: 'XX', // Unsupported country
        cardholderAccounts: [], // Not a cardholder
      };

      const mockRootState = {
        card: stateWithAlwaysShow,
      } as unknown as RootState;

      expect(selectDisplayCardButton(mockRootState)).toBe(true);
    });

    it('should return true when user is a cardholder', () => {
      const stateWithCardholder: CardSliceState = {
        ...initialState,
        cardholderAccounts: [mockAccountAddress.toLowerCase()],
        alwaysShowCardButton: false,
        geoLocation: 'XX', // Unsupported country
      };

      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        () => mockAccount,
      );
      mockIsEthAccount.mockReturnValue(true);
      mockSelectCardExperimentalSwitch.mockReturnValue(false);

      const mockRootState = {
        card: stateWithCardholder,
      } as unknown as RootState;

      expect(selectDisplayCardButton(mockRootState)).toBe(true);
    });

    it('should return true when in supported country with feature flag enabled', () => {
      mockSelectCardSupportedCountries.mockReturnValue({ US: true });
      mockSelectDisplayCardButtonFeatureFlag.mockReturnValue(true);

      const stateWithGeoLocation: CardSliceState = {
        ...initialState,
        geoLocation: 'US',
        cardholderAccounts: [],
        alwaysShowCardButton: false,
      };

      const mockRootState = {
        card: stateWithGeoLocation,
      } as unknown as RootState;

      expect(selectDisplayCardButton(mockRootState)).toBe(true);
    });

    it('should return false when in supported country but feature flag is disabled', () => {
      mockSelectCardSupportedCountries.mockReturnValue({ US: true });
      mockSelectDisplayCardButtonFeatureFlag.mockReturnValue(false);

      const stateWithGeoLocation: CardSliceState = {
        ...initialState,
        geoLocation: 'US',
        cardholderAccounts: [],
        alwaysShowCardButton: false,
      };

      const mockRootState = {
        card: stateWithGeoLocation,
      } as unknown as RootState;

      expect(selectDisplayCardButton(mockRootState)).toBe(false);
    });

    it('should return false when feature flag is enabled but country is not supported', () => {
      mockSelectCardSupportedCountries.mockReturnValue({ US: true });
      mockSelectDisplayCardButtonFeatureFlag.mockReturnValue(true);

      const stateWithUnsupportedGeoLocation: CardSliceState = {
        ...initialState,
        geoLocation: 'CN', // Not in supported countries
        cardholderAccounts: [],
        alwaysShowCardButton: false,
      };

      const mockRootState = {
        card: stateWithUnsupportedGeoLocation,
      } as unknown as RootState;

      expect(selectDisplayCardButton(mockRootState)).toBe(false);
    });

    it('should return false when no conditions are met', () => {
      const mockRootState = {
        card: initialState,
      } as unknown as RootState;

      expect(selectDisplayCardButton(mockRootState)).toBe(false);
    });

    it('should handle multiple supported countries', () => {
      mockSelectCardSupportedCountries.mockReturnValue({
        US: true,
        GB: true,
        CA: true,
        DE: false, // Explicitly false
      });
      mockSelectDisplayCardButtonFeatureFlag.mockReturnValue(true);

      // Test US
      let state: CardSliceState = {
        ...initialState,
        geoLocation: 'US',
        cardholderAccounts: [],
        alwaysShowCardButton: false,
      };
      let mockRootState = { card: state } as unknown as RootState;
      expect(selectDisplayCardButton(mockRootState)).toBe(true);

      // Test GB
      state = { ...state, geoLocation: 'GB' };
      mockRootState = { card: state } as unknown as RootState;
      expect(selectDisplayCardButton(mockRootState)).toBe(true);

      // Test CA
      state = { ...state, geoLocation: 'CA' };
      mockRootState = { card: state } as unknown as RootState;
      expect(selectDisplayCardButton(mockRootState)).toBe(true);

      // Test DE (explicitly false)
      state = { ...state, geoLocation: 'DE' };
      mockRootState = { card: state } as unknown as RootState;
      expect(selectDisplayCardButton(mockRootState)).toBe(false);
    });

    it('should prioritize alwaysShowCardButton over other conditions', () => {
      mockSelectCardExperimentalSwitch.mockReturnValue(true);
      mockSelectCardSupportedCountries.mockReturnValue({});
      mockSelectDisplayCardButtonFeatureFlag.mockReturnValue(false);

      const state: CardSliceState = {
        ...initialState,
        alwaysShowCardButton: true,
        geoLocation: 'XX',
        cardholderAccounts: [],
      };

      const mockRootState = { card: state } as unknown as RootState;

      expect(selectDisplayCardButton(mockRootState)).toBe(true);
    });

    it('should handle UNKNOWN geolocation gracefully', () => {
      mockSelectCardSupportedCountries.mockReturnValue({ US: true });
      mockSelectDisplayCardButtonFeatureFlag.mockReturnValue(true);

      const state: CardSliceState = {
        ...initialState,
        geoLocation: 'UNKNOWN',
        cardholderAccounts: [],
        alwaysShowCardButton: false,
      };

      const mockRootState = { card: state } as unknown as RootState;

      expect(selectDisplayCardButton(mockRootState)).toBe(false);
    });

    it('should return true when all three conditions are true', () => {
      mockSelectCardExperimentalSwitch.mockReturnValue(true);
      mockSelectCardSupportedCountries.mockReturnValue({ US: true });
      mockSelectDisplayCardButtonFeatureFlag.mockReturnValue(true);
      mockSelectSelectedInternalAccountByScope.mockReturnValue(
        () => mockAccount,
      );
      mockIsEthAccount.mockReturnValue(true);

      const state: CardSliceState = {
        ...initialState,
        alwaysShowCardButton: true,
        geoLocation: 'US',
        cardholderAccounts: [mockAccountAddress.toLowerCase()],
      };

      const mockRootState = { card: state } as unknown as RootState;

      expect(selectDisplayCardButton(mockRootState)).toBe(true);
    });
  });
});
