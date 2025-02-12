import React from 'react';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { stakingDepositConfirmationState } from '../../../../../../util/test/confirm-data-helpers';
import StakingDetails from './StakingDetails';
import { decGWEIToHexWEI } from '../../../../../../util/conversions';
import initialRootState from '../../../../../../util/test/initial-root-state';

describe('TokenHero', () => {
  it('contains token and fiat values for staking deposit', async () => {
    const { getByText } = renderWithProvider(<StakingDetails />, {
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

    expect(getByText('APR')).toBeDefined();
    expect(getByText('2.2%')).toBeDefined();

    expect(getByText('Est. annual reward')).toBeDefined();
    expect(getByText('$7.91')).toBeDefined();
    expect(getByText('0.0022 ETH')).toBeDefined();

    expect(getByText('Reward frequency')).toBeDefined();
    expect(getByText('12 hours')).toBeDefined();

    expect(getByText('Withdrawal time')).toBeDefined();
    expect(getByText('1 to 11 days')).toBeDefined();
  });
});
