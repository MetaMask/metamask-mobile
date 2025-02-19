import { merge } from 'lodash';
import { decGWEIToHexWEI } from '../../../../util/conversions';
import { stakingDepositConfirmationState } from '../../../../util/test/confirm-data-helpers';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { useStakingDetails } from './useStakingDetails';

describe('useStakingDetails', () => {
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
          },
        },
        staking: {
          vaultData: { apy: '2.2' },
        },
      });

      const { result } = renderHookWithProvider(useStakingDetails, { state });

      expect(result.current).toEqual({
        annualRewardsETH: '0.0022 ETH',
        annualRewardsFiat: '$7.91',
        apr: '2.2%',
      });
    });
  });
});
