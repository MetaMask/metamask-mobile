import { strings } from '../../../../../locales/i18n';
import { EARN_ACTIONS } from '../Views/InputView/InputView.types';

export const isEarnFeatureEnabled = () =>
  process.env.ENABLE_EARN_FEATURES === 'true';

export const EVENT_LOCATIONS = {
  EARN_INPUT_VIEW: 'earn_input_view',
  EARN_CONFIRMATION_VIEW: 'earn_confirmation_view',
  WALLET_ACTIONS_BOTTOM_SHEET: 'wallet_actions_bottom_sheet',
  TOKEN_DETAILS: 'token_details',
};

export const EVENT_PROVIDERS = {
  CONSENSYS: 'consensys',
};

export const ACTION_TO_LABEL_MAP: Record<EARN_ACTIONS, string> = {
  [EARN_ACTIONS.STAKE]: strings('earn.stake'),
  [EARN_ACTIONS.LEND]: strings('earn.lend'),
  [EARN_ACTIONS.DEPOSIT]: strings('earn.deposit'),
};
