import { CardActionType, CardAction } from '../../actions/card/types';

export interface CardState {
  cardholderAccounts: string[];
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
  lastUpdated: number | null;
}

/**
 * Initial state for the card reducer
 */
const initialState: CardState = {
  cardholderAccounts: [],
  isLoading: false,
  isLoaded: false,
  error: null,
  lastUpdated: null,
};

/**
 * Card reducer - manages card-related state
 */
const cardReducer = (state = initialState, action?: CardAction): CardState => {
  switch (action?.type) {
    case CardActionType.LOAD_CARDHOLDER_ACCOUNTS_REQUEST:
      return {
        ...state,
        isLoading: true,
        error: null,
      };

    case CardActionType.LOAD_CARDHOLDER_ACCOUNTS_SUCCESS:
      return {
        ...state,
        cardholderAccounts: action.payload.cardholderAccounts,
        isLoaded: true,
        isLoading: false,
        error: null,
        lastUpdated: Date.now(),
      };

    case CardActionType.LOAD_CARDHOLDER_ACCOUNTS_FAILURE:
      return {
        ...state,
        isLoading: false,
        error: action.payload.error,
        isLoaded: false,
      };

    default:
      return state;
  }
};

export default cardReducer;
