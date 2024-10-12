import React from 'react';

import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { personalSignatureConfirmationState } from '../../../../../../../util/test/confirm-data-helpers';
import AccountNetworkInfoCollapsed from './AccountNetworkInfoCollapsed';

describe('AccountNetworkInfoCollapsed', () => {
  it('should match snapshot for personal sign', async () => {
    const container = renderWithProvider(<AccountNetworkInfoCollapsed />, {
      state: personalSignatureConfirmationState,
    });
    expect(container).toMatchSnapshot();
  });
});
