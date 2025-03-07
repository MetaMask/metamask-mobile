import { merge } from 'lodash';
import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { stakingDepositConfirmationState, stakingWithdrawalConfirmationState } from '../../../../../../util/test/confirm-data-helpers';
import ContractInteractionDetails, { ContractInteractionDetailsVariant } from './ContractInteractionDetails';

describe('ContractInteractionDetails', () => {
  it('should render correctly with staking deposit variant', () => { 
    const { getByText } = renderWithProvider(<ContractInteractionDetails variant={ContractInteractionDetailsVariant.StakingDeposit} />, {
      state: stakingDepositConfirmationState,
    });
    expect(getByText('Staking from')).toBeDefined();
    expect(getByText('Interacting with')).toBeDefined();
    expect(getByText('Network')).toBeDefined();
    expect(getByText('Ethereum Mainnet')).toBeDefined();
  });

  it('should render correctly with staking withdrawal variant', () => {
    const { getByText } = renderWithProvider(<ContractInteractionDetails variant={ContractInteractionDetailsVariant.StakingWithdrawal} />, {
      state: merge(stakingWithdrawalConfirmationState, {
        engine: {
          backgroundState: {
            AccountsController: {
              internalAccounts: {
                accounts: {
                  '0x0000000000000000000000000000000000000000': {
                    address: '0x0000000000000000000000000000000000000000',
                  },
                },
                selectedAccount: '0x0000000000000000000000000000000000000000',
              },
            },
          }
        }
      }),
    });
    expect(getByText('Unstaking to')).toBeDefined();
    expect(getByText('Interacting with')).toBeDefined();
    expect(getByText('Network')).toBeDefined();
    expect(getByText('Ethereum Mainnet')).toBeDefined();
  });
});