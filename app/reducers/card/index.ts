import { CardActionType, CardAction } from '../../actions/card/types';

export interface CardState {
  cardholderAccounts: string[];
  lastUpdated: number | null;
}

/**
 * Initial state for the card reducer
 */
const initialState: CardState = {
  cardholderAccounts: [],
  lastUpdated: null,
};

/**
 * Card reducer - manages card-related state
 */
const cardReducer = (state = initialState, action?: CardAction): CardState => {
  switch (action?.type) {
    case CardActionType.LOAD_CARDHOLDER_ACCOUNTS_SUCCESS:
      return {
        ...state,
        cardholderAccounts: action.payload.cardholderAccounts,
        lastUpdated: Date.now(),
      };
    default:
      return state;
  }
};

export default cardReducer;
