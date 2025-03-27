import { fireEvent } from '@testing-library/react-native';
import React from 'react';
import { stakingDepositConfirmationState } from '../../../../../../util/test/confirm-data-helpers';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import AdvancedDetails from './AdvancedDetails';

describe('AdvancedDetails', () => {
  it('contains values for staking deposit', async () => {
    const { getByText } = renderWithProvider(<AdvancedDetails />, {
      state: stakingDepositConfirmationState,
    });

    expect(getByText('Advanced details')).toBeDefined();

    fireEvent(getByText('Advanced details'), 'onPress');

    expect(getByText('Advanced details')).toBeDefined();

    expect(getByText('Staking from')).toBeDefined();
    expect(getByText('0xDc477...0c164')).toBeDefined();

    expect(getByText('Interacting with')).toBeDefined();
    expect(getByText('Pooled Staking')).toBeDefined();

    expect(getByText('Network')).toBeDefined();
    expect(getByText('Ethereum Mainnet')).toBeDefined();
  });
});
