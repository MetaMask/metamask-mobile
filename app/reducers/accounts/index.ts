import { AccountsActionType, iAccountActions } from '../../actions/accounts';

/**
 * Interface for defining what properties will be defined in store
 */
export interface iAccountEvent {
  reloadAccounts: boolean;
}

/**
 * Initial state of the Accounts event flow
 */
const initialState: iAccountEvent = {
  reloadAccounts: false,
};

/**
 * Reducer to Account relative event
 * @param {iAccountEvent} state: the state of the Accounts event flow, default to initialState
 * @param {iAccountActions} action: the action object contain type and payload to change state.
 * @returns {iAccountEvent}: the new state of the Accounts event flow
 */
const accountReducer = (
  state = initialState,
  action: iAccountActions = {
    type: '',
    reloadAccounts: false,
  },
) => {
  switch (action.type) {
    case AccountsActionType.SET_RELOAD_ACCOUNTS:
      return {
        ...state,
        reloadAccounts: action.reloadAccounts,
      };
    default:
      return state;
  }
};
export default accountReducer;
