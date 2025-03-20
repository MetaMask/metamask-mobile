import React from 'react';
import { stakingDepositConfirmationState, stakingWithdrawalConfirmationState } from '../../../../../../util/test/confirm-data-helpers';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import StakingContractInteractionDetails from './StakingContractInteractionDetails';

describe('StakingContractInteractionDetails', () => {
  it('should render correctly with staking deposit variant', () => {
    const { getByText } = renderWithProvider(<StakingContractInteractionDetails />, {
      state: stakingDepositConfirmationState,
    });
    expect(getByText('Staking from')).toBeDefined();
    expect(getByText('Interacting with')).toBeDefined();
    expect(getByText('Network')).toBeDefined();
    expect(getByText('Ethereum Mainnet')).toBeDefined();
  });

  it('should render correctly with staking withdrawal variant', () => {
    const { getByText } = renderWithProvider(<StakingContractInteractionDetails />, {
      state: stakingWithdrawalConfirmationState,
    });
    expect(getByText('Unstaking to')).toBeDefined();
    expect(getByText('Interacting with')).toBeDefined();
    expect(getByText('Network')).toBeDefined();
    expect(getByText('Ethereum Mainnet')).toBeDefined();
  });
});
