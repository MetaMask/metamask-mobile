import { RootState } from '../../../../reducers';
import cardReducer, {
  CardSliceState,
  selectCardholderAccounts,
  selectIsCardholder,
  loadCardholderAccounts,
  resetCardState,
  initialState,
} from '.';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';

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

const CARD_STATE_MOCK: CardSliceState = {
  cardholderAccounts: CARDHOLDER_ACCOUNTS_MOCK,
  isLoaded: true,
};

const EMPTY_CARD_STATE_MOCK: CardSliceState = {
  cardholderAccounts: [],
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
        isLoaded: true,
      };

      const state = cardReducer(currentState, resetCardState());

      expect(state).toEqual(initialState);
    });
  });
});
