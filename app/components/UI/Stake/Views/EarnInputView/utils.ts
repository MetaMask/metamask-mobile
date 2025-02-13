import { EARN_ACTIONS } from './EarnInputView.types';
import { strings } from '../../../../../../locales/i18n';

const ACTION_TO_LABEL_MAP: Record<EARN_ACTIONS, string> = {
  [EARN_ACTIONS.STAKE]: strings('earn.stake'),
  [EARN_ACTIONS.LEND]: strings('earn.lend'),
  [EARN_ACTIONS.DEPOSIT]: strings('earn.deposit'),
};

export const getEarnInputViewTitle = (
  action: EARN_ACTIONS,
  tokenSymbol: string,
) => {
  const prefix = ACTION_TO_LABEL_MAP[action];
  return `${prefix} ${tokenSymbol}`;
};
