import cardReducer from './index';
import {
  loadCardholderAccountsRequest,
  loadCardholderAccountsSuccess,
  loadCardholderAccountsFailure,
} from '../../actions/card';
import { CardState } from './types';

describe('Card Reducer', () => {
  const initialState: CardState = {
    cardholderAccounts: [],
    isLoaded: false,
    isLoading: false,
    error: null,
    lastUpdated: null,
    sdkInitialized: false,
  };

  it('should return initial state', () => {
    expect(cardReducer()).toEqual(initialState);
  });

  it('should handle LOAD_CARDHOLDER_ACCOUNTS_REQUEST', () => {
    const action = loadCardholderAccountsRequest();
    const newState = cardReducer(initialState, action);

    expect(newState).toEqual({
      ...initialState,
      isLoading: true,
      error: null,
    });
  });

  it('should handle LOAD_CARDHOLDER_ACCOUNTS_SUCCESS', () => {
    const cardholderAccounts = ['0x123...', '0x456...'];
    const action = loadCardholderAccountsSuccess(cardholderAccounts);
    const loadingState = { ...initialState, isLoading: true };
    const newState = cardReducer(loadingState, action);

    expect(newState.cardholderAccounts).toEqual(cardholderAccounts);
    expect(newState.isLoaded).toBe(true);
    expect(newState.isLoading).toBe(false);
    expect(newState.error).toBe(null);
    expect(newState.lastUpdated).toBeGreaterThan(0);
  });

  it('should handle LOAD_CARDHOLDER_ACCOUNTS_FAILURE', () => {
    const error = 'Network error';
    const action = loadCardholderAccountsFailure(error);
    const loadingState = { ...initialState, isLoading: true };
    const newState = cardReducer(loadingState, action);

    expect(newState.isLoading).toBe(false);
    expect(newState.error).toBe(error);
    expect(newState.isLoaded).toBe(false);
  });
});
