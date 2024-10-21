import React from 'react';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { personalSignatureConfirmationState } from '../../../../../../util/test/confirm-data-helpers';
import AccountNetworkInfo from './AccountNetworkInfo';

describe('AccountNetworkInfo', () => {
  it('should match snapshot for personal sign', async () => {
    const container = renderWithProvider(<AccountNetworkInfo />, {
      state: personalSignatureConfirmationState,
    });
    expect(container).toMatchSnapshot();
  });
});
