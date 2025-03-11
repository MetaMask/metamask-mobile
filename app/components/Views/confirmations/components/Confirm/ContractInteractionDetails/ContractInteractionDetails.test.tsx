import React from 'react';
import { stakingDepositConfirmationState, stakingWithdrawalConfirmationState } from '../../../../../../util/test/confirm-data-helpers';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import ContractInteractionDetails from './ContractInteractionDetails';

describe('ContractInteractionDetails', () => {
  it('should render correctly with staking deposit variant', () => { 
    const { getByText } = renderWithProvider(<ContractInteractionDetails />, {
      state: stakingDepositConfirmationState,
    });
    expect(getByText('Staking from')).toBeDefined();
    expect(getByText('Interacting with')).toBeDefined();
    expect(getByText('Network')).toBeDefined();
    expect(getByText('Ethereum Mainnet')).toBeDefined();
  });

  it('should render correctly with staking withdrawal variant', () => {
    const { getByText } = renderWithProvider(<ContractInteractionDetails />, {
      state: stakingWithdrawalConfirmationState,
    });
    expect(getByText('Unstaking to')).toBeDefined();
    expect(getByText('Interacting with')).toBeDefined();
    expect(getByText('Network')).toBeDefined();
    expect(getByText('Ethereum Mainnet')).toBeDefined();
  });
});