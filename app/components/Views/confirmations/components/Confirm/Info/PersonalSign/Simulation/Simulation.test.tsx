import React from 'react';

import renderWithProvider from '../../../../../../../../util/test/renderWithProvider';
import { personalSignatureConfirmationState } from '../../../../../../../../util/test/confirm-data-helpers';
import Simulation from './index';

describe('Simulation', () => {
  it('should match snapshot', async () => {
    const container = renderWithProvider(<Simulation />, {
      state: personalSignatureConfirmationState,
    });
    expect(container).toMatchSnapshot();
  });
});
