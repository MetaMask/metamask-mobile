import cardReducer, { CardState } from './index';
import { loadCardholderAccountsSuccess } from '../../actions/card';

describe('Card Reducer', () => {
  const initialState: CardState = {
    cardholderAccounts: [],
    lastUpdated: null,
  };

  it('should return initial state', () => {
    expect(cardReducer()).toEqual(initialState);
  });

  it('should handle LOAD_CARDHOLDER_ACCOUNTS_SUCCESS', () => {
    const cardholderAccounts = ['0x123...', '0x456...'];
    const action = loadCardholderAccountsSuccess(cardholderAccounts);
    const loadingState = { ...initialState, isLoading: true };
    const newState = cardReducer(loadingState, action);

    expect(newState.cardholderAccounts).toEqual(cardholderAccounts);
    expect(newState.lastUpdated).toBeGreaterThan(0);
  });
});
