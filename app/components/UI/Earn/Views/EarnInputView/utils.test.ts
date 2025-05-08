import {
  EARN_INPUT_ACTION_TO_LABEL_MAP,
  EARN_INPUT_VIEW_ACTIONS,
} from './EarnInputView.types';
import { getEarnInputViewTitle } from './utils';

describe('EarnInputView Utils', () => {
  describe('getEarnInputViewTitle', () => {
    it('returns ETH staking title', () => {
      const action =
        EARN_INPUT_ACTION_TO_LABEL_MAP[EARN_INPUT_VIEW_ACTIONS.STAKE];

      const result = getEarnInputViewTitle(EARN_INPUT_VIEW_ACTIONS.STAKE);
      expect(result).toEqual(`${action}`);
    });

    it('returns stablecoin lending deposit title', () => {
      const action =
        EARN_INPUT_ACTION_TO_LABEL_MAP[EARN_INPUT_VIEW_ACTIONS.LEND];

      const result = getEarnInputViewTitle(EARN_INPUT_VIEW_ACTIONS.LEND);
      expect(result).toEqual(`${action}`);
    });
  });
});
