import { AccountsActionType, iAccountActions } from '../../actions/accounts';

const initialState = {
  reloadAccounts: false,
};

const accountReducer = (state = initialState, action: iAccountActions) => {
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
