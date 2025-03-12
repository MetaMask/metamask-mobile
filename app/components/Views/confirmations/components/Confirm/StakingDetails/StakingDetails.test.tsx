import { merge } from 'lodash';
import React from 'react';
import { RootState } from '../../../../../../reducers';
import { decGWEIToHexWEI } from '../../../../../../util/conversions';
import { stakingDepositConfirmationState } from '../../../../../../util/test/confirm-data-helpers';
import renderWithProvider, {
  DeepPartial,
} from '../../../../../../util/test/renderWithProvider';
import StakingDetails from './StakingDetails';
import { mockEarnControllerRootState } from '../../../../../UI/Stake/testUtils';

describe('TokenHero', () => {
  const mockEarnControllerState =
    mockEarnControllerRootState().engine.backgroundState.EarnController;

  it('contains token and fiat values for staking deposit', async () => {
    const state: DeepPartial<RootState> = merge(
      {},
      stakingDepositConfirmationState,
      {
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
      },
    );

    const { getByText } = renderWithProvider(<StakingDetails />, { state });

    expect(getByText('APR')).toBeDefined();
    expect(getByText('3.3%')).toBeDefined();

    expect(getByText('Est. annual reward')).toBeDefined();
    expect(getByText('$11.72')).toBeDefined();
    expect(getByText('0.00326 ETH')).toBeDefined();

    expect(getByText('Reward frequency')).toBeDefined();
    expect(getByText('12 hours')).toBeDefined();

    expect(getByText('Withdrawal time')).toBeDefined();
    expect(getByText('1 to 11 days')).toBeDefined();
  });
});
