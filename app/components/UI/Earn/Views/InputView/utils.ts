import { EARN_ACTIONS } from './InputView.types';
import { ACTION_TO_LABEL_MAP } from '../../constants';

export const getEarnInputViewTitle = (
  action: EARN_ACTIONS,
  tokenSymbol: string,
) => {
  const prefix = ACTION_TO_LABEL_MAP[action];
  return `${prefix} ${tokenSymbol}`;
};
