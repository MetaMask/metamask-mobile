import {
  EARN_INPUT_ACTION_TO_LABEL_MAP,
  EARN_INPUT_VIEW_ACTIONS,
} from './EarnInputView.types';

export const getEarnInputViewTitle = (action: EARN_INPUT_VIEW_ACTIONS) => {
  const prefix = EARN_INPUT_ACTION_TO_LABEL_MAP[action];

  return `${prefix}`;
};
