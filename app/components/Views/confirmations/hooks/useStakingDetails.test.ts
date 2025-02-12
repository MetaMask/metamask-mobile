import { useStakingDetails } from './useStakingDetails';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { stakingDepositConfirmationState } from '../../../../util/test/confirm-data-helpers';
import initialRootState from '../../../../util/test/initial-root-state';
import { decGWEIToHexWEI } from '../../../../util/conversions';

describe('useStakingDetails', () => {
  describe('staking deposit', () => {
    it('returns token and fiat values', () => {
      const { result } = renderHookWithProvider(useStakingDetails, {
        state: {
          ...stakingDepositConfirmationState,
          engine: {
            ...stakingDepositConfirmationState.engine,
            backgroundState: {
              ...stakingDepositConfirmationState.engine.backgroundState,
              TransactionController: {
                ...stakingDepositConfirmationState.engine.backgroundState.TransactionController,
                transactions: [
                  {
                    ...stakingDepositConfirmationState.engine.backgroundState.TransactionController.transactions[0],
                    txParams: {
                      ...stakingDepositConfirmationState.engine.backgroundState.TransactionController.transactions[0].txParams,
                      value: `0x${decGWEIToHexWEI(10 ** 8)}`,
                    },
                  }
                ]
              },
            },
          },
          staking: {
            ...initialRootState.staking,
            vaultData: {
              ...initialRootState.staking.vaultData,
              apy: '2.2',
            },
          },
        },
      });

      expect(result.current).toEqual({
        annualRewardsETH: '0.0022 ETH',
        annualRewardsFiat: '$7.91',
        apr: '2.2%',
      });
    });
  });
});
