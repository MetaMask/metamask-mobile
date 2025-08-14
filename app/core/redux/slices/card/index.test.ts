import { RootState } from '../../../../reducers';
import cardReducer, {
  CardSliceState,
  selectCardholderAccounts,
  selectIsCardholder,
  loadCardholderAccounts,
  resetCardState,
  initialState,
} from '.';

// Mock the multichain selectors
jest.mock('../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: jest.fn(),
}));

// Mock the multichain utils
jest.mock('../../../Multichain/utils', () => ({
  isEthAccount: jest.fn(),
}));

import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { isEthAccount } from '../../../Multichain/utils';

const mockSelectSelectedInternalAccountByScope =
  selectSelectedInternalAccountByScope as jest.MockedFunction<
    typeof selectSelectedInternalAccountByScope
  >;

const mockIsEthAccount = isEthAccount as jest.MockedFunction<
  typeof isEthAccount
>;

const CARDHOLDER_ACCOUNTS_MOCK: string[] = [
  '0x1234567890123456789012345678901234567890',
  '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
];

const CARD_STATE_MOCK: CardSliceState = {
  cardholderAccounts: CARDHOLDER_ACCOUNTS_MOCK,
  isLoaded: true,
};

const EMPTY_CARD_STATE_MOCK: CardSliceState = {
  cardholderAccounts: [],
  isLoaded: false,
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
        isLoaded: true,
      };

      const state = cardReducer(currentState, resetCardState());

      expect(state).toEqual(initialState);
    });
  });
});
