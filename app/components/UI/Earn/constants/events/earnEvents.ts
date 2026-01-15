// Legacy events
import { EVENT_LOCATIONS as STAKE_EVENT_LOCATIONS } from '../../../Stake/constants/events';

export const EVENT_PROVIDERS = {
  CONSENSYS: 'consensys',
};

export const EVENT_LOCATIONS = {
  ...STAKE_EVENT_LOCATIONS,
  TOKEN_DETAILS_SCREEN: 'TokenDetailsScreen',
  LENDING_EARNINGS: 'LendingEarnings',
  EARN_INPUT_VIEW: 'EarnInputView',
  EARN_WITHDRAWAL_INPUT_VIEW: 'EarnWithdrawalInputView',
  EARN_LENDING_DEPOSIT_CONFIRMATION_VIEW: 'EarnLendingDepositConfirmationView',
  EARN_LENDING_WITHDRAW_CONFIRMATION_VIEW:
    'EarnLendingWithdrawConfirmationView',
};
