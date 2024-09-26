import React from 'react';

import renderWithProvider from '../../../../util/test/renderWithProvider';
import { personalSignatureConfirmationState } from '../../../../util/test/confirm-data-helpers';
import Confirm from './index';

describe('Confirm', () => {
  it('should match snapshot for personal sign', async () => {
    const container = renderWithProvider(<Confirm />, {
      state: personalSignatureConfirmationState,
    });
    expect(container).toMatchSnapshot();
  });
});
