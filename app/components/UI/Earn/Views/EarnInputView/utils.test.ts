import {
  MOCK_ETH_MAINNET_ASSET,
  MOCK_SUPPORTED_EARN_TOKENS_WITH_FIAT_BALANCE,
} from '../../../Stake/__mocks__/mockData';
import {
  EARN_INPUT_ACTION_TO_LABEL_MAP,
  EARN_INPUT_VIEW_ACTIONS,
} from './EarnInputView.types';
import { getEarnInputViewTitle } from './utils';

describe('EarnInputView Utils', () => {
  describe('getEarnInputViewTitle', () => {
    it('returns ETH staking title', () => {
      const { symbol, isETH } = MOCK_ETH_MAINNET_ASSET;
      const action =
        EARN_INPUT_ACTION_TO_LABEL_MAP[EARN_INPUT_VIEW_ACTIONS.STAKE];

      const result = getEarnInputViewTitle(
        EARN_INPUT_VIEW_ACTIONS.STAKE,
        symbol,
        isETH,
      );
      expect(result).toEqual(`${action} ETH`);
    });

    it('returns stablecoin lending deposit title', () => {
      // Dai Stablecoin
      const { symbol, isETH } = MOCK_SUPPORTED_EARN_TOKENS_WITH_FIAT_BALANCE[1];
      const action =
        EARN_INPUT_ACTION_TO_LABEL_MAP[EARN_INPUT_VIEW_ACTIONS.LEND];

      const result = getEarnInputViewTitle(
        EARN_INPUT_VIEW_ACTIONS.LEND,
        symbol,
        isETH,
      );
      expect(result).toEqual(`${action} ${symbol}`);
    });
  });
});
