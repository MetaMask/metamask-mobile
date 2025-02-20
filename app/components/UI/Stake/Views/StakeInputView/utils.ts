import {
  STAKE_INPUT_ACTION_TO_LABEL_MAP,
  STAKE_INPUT_VIEW_ACTIONS,
} from './StakeInputView.types';

export const getStakeInputViewTitle = (
  action: STAKE_INPUT_VIEW_ACTIONS,
  tokenSymbol: string,
  isEth = false,
) => {
  const prefix = STAKE_INPUT_ACTION_TO_LABEL_MAP[action];
  const suffix = isEth ? 'ETH' : tokenSymbol;

  return `${prefix} ${suffix}`;
};
