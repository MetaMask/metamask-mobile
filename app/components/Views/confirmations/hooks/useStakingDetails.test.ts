import { merge } from 'lodash';
import { decGWEIToHexWEI } from '../../../../util/conversions';
import { stakingDepositConfirmationState } from '../../../../util/test/confirm-data-helpers';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { useStakingDetails } from './useStakingDetails';
import { MOCK_EARN_CONTROLLER_STATE } from '../../../UI/Stake/__mocks__/mockData';

describe('useStakingDetails', () => {
  describe('staking deposit', () => {
    // TODO: FIXME
    it('returns token and fiat values', () => {
      const state = merge({}, stakingDepositConfirmationState, {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [
                {
                  txParams: { value: `0x${decGWEIToHexWEI(10 ** 8)}` },
                },
              ],
            },
            EarnController:
              MOCK_EARN_CONTROLLER_STATE.engine?.backgroundState
                ?.EarnController,
          },
        },
      });

      const { result } = renderHookWithProvider(useStakingDetails, { state });

      expect(result.current).toEqual({
        annualRewardsETH: '0.00326 ETH',
        annualRewardsFiat: '$11.71',
        apr: '3.3%',
      });
    });
  });
});
