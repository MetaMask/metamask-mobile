export interface ConfirmationState {
  upgradeSplashPageAcknowledgedForAccounts: string[];
}

export const initialState: ConfirmationState = {
  upgradeSplashPageAcknowledgedForAccounts: [],
};

const confirmationReducer = (
  state = initialState,
  action: {
    type: string;
    account?: string;
  } = { type: '' },
) => {
  switch (action.type) {
    case 'UPGRADE_SPLASH_PAGE_ACKNOWLEDGED_FOR_ACCOUNT': {
      const { account } = action;
      const upgradeSplashPageAcknowledgedForAccounts = [
        ...state.upgradeSplashPageAcknowledgedForAccounts,
      ];
      if (
        account &&
        !state.upgradeSplashPageAcknowledgedForAccounts.includes(account)
      ) {
        upgradeSplashPageAcknowledgedForAccounts.push(account);
      }
      return {
        ...state,
        upgradeSplashPageAcknowledgedForAccounts,
      };
    }
    default:
      return state;
  }
};

export default confirmationReducer;
