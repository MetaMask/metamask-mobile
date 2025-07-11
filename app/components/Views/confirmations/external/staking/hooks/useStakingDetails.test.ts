import { merge } from 'lodash';
import { decGWEIToHexWEI } from '../../../../../../util/conversions';
import { stakingDepositConfirmationState } from '../../../../../../util/test/confirm-data-helpers';
import { renderHookWithProvider } from '../../../../../../util/test/renderWithProvider';
import { useStakingDetails } from './useStakingDetails';
import { mockEarnControllerRootState } from '../../../../../UI/Stake/testUtils';

describe('useStakingDetails', () => {
  const mockEarnControllerState =
    mockEarnControllerRootState().engine.backgroundState.EarnController;

  describe('staking deposit', () => {
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
            EarnController: mockEarnControllerState,
          },
        },
      });

      const { result } = renderHookWithProvider(useStakingDetails, { state });

      expect(result.current).toEqual({
        annualRewardsETH: '0.00326 ETH',
        annualRewardsFiat: '$11.72',
        apr: '3.3%',
      });
    });
  });
});
