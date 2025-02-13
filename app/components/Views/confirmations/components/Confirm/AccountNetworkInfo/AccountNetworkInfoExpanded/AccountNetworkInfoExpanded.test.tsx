import React from 'react';

import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { personalSignatureConfirmationState } from '../../../../../../../util/test/confirm-data-helpers';
import AccountNetworkInfoExpanded from './AccountNetworkInfoExpanded';

jest.mock('../../../../../../../core/Engine', () => ({
  getTotalFiatAccountBalance: () => ({ tokenFiat: 10 }),
}));

describe('AccountNetworkInfoExpanded', () => {
  it('should render correctly', async () => {
    const { getByText } = renderWithProvider(<AccountNetworkInfoExpanded />, {
      state: personalSignatureConfirmationState,
    });
    expect(getByText('Account')).toBeDefined();
    expect(getByText('Balance')).toBeDefined();
    expect(getByText('$10')).toBeDefined();
    expect(getByText('Network')).toBeDefined();
    expect(getByText('Ethereum Mainnet')).toBeDefined();
  });
});
