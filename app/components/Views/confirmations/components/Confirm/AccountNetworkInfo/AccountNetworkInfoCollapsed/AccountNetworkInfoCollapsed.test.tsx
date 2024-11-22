import React from 'react';

import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { personalSignatureConfirmationState } from '../../../../../../../util/test/confirm-data-helpers';
import AccountNetworkInfoCollapsed from './AccountNetworkInfoCollapsed';

describe('AccountNetworkInfoCollapsed', () => {
  it('should render correctly', async () => {
    const { getByText } = renderWithProvider(<AccountNetworkInfoCollapsed />, {
      state: personalSignatureConfirmationState,
    });
    expect(getByText('0x935E...5477')).toBeDefined();
    expect(getByText('Ethereum Mainnet')).toBeDefined();
  });
});
