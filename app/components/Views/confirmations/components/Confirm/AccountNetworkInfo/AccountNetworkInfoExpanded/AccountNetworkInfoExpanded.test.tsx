import React from 'react';

import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { personalSignatureConfirmationState } from '../../../../../../../util/test/confirm-data-helpers';
import AccountNetworkInfoExpanded from './AccountNetworkInfoExpanded';

describe('AccountNetworkInfoExpanded', () => {
  it('should render correctly', async () => {
    const { getByText } = renderWithProvider(<AccountNetworkInfoExpanded />, {
      state: personalSignatureConfirmationState,
    });
    expect(getByText('Account')).toBeDefined();
    expect(getByText('Balance')).toBeDefined();
    expect(getByText('0 ETH')).toBeDefined();
    expect(getByText('Network')).toBeDefined();
    expect(getByText('Ethereum Mainnet')).toBeDefined();
    expect(getByText('RPC URL')).toBeDefined();
    expect(getByText('mainnet.infura.io/v3/')).toBeDefined();
  });
});
