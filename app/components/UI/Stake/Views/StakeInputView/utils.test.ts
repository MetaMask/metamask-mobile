import {
  MOCK_ETH_MAINNET_ASSET,
  MOCK_SUPPORTED_EARN_TOKENS_WITH_FIAT_BALANCE,
} from '../../__mocks__/mockData';
import {
  STAKE_INPUT_ACTION_TO_LABEL_MAP,
  STAKE_INPUT_VIEW_ACTIONS,
} from './StakeInputView.types';
import { getStakeInputViewTitle } from './utils';

describe('StakeInputView Utils', () => {
  describe('getStakeInputViewTitle', () => {
    it('returns ETH staking title', () => {
      const { symbol, isETH } = MOCK_ETH_MAINNET_ASSET;
      const action =
        STAKE_INPUT_ACTION_TO_LABEL_MAP[STAKE_INPUT_VIEW_ACTIONS.STAKE];

      const result = getStakeInputViewTitle(
        STAKE_INPUT_VIEW_ACTIONS.STAKE,
        symbol,
        isETH,
      );
      expect(result).toEqual(`${action} ETH`);
    });

    it('returns stablecoin lending deposit title', () => {
      // Dai Stablecoin
      const { symbol, isETH } = MOCK_SUPPORTED_EARN_TOKENS_WITH_FIAT_BALANCE[1];
      const action =
        STAKE_INPUT_ACTION_TO_LABEL_MAP[STAKE_INPUT_VIEW_ACTIONS.LEND];

      const result = getStakeInputViewTitle(
        STAKE_INPUT_VIEW_ACTIONS.LEND,
        symbol,
        isETH,
      );
      expect(result).toEqual(`${action} ${symbol}`);
    });
  });
});
