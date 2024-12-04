import React from 'react';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { personalSignatureConfirmationState } from '../../../../../../util/test/confirm-data-helpers';
import AccountNetworkInfo from './AccountNetworkInfo';

describe('AccountNetworkInfo', () => {
  it('should render correctly', async () => {
    const { getByText } = renderWithProvider(<AccountNetworkInfo />, {
      state: personalSignatureConfirmationState,
    });
    expect(getByText('0x935E...5477')).toBeDefined();
    expect(getByText('Ethereum Mainnet')).toBeDefined();
  });
});
