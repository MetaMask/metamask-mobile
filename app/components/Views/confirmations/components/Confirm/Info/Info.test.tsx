import React from 'react';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { personalSignatureConfirmationState } from '../../../../../../util/test/confirm-data-helpers';
import Info from './Info';

describe('Info', () => {
  it('should match snapshot for personal sign', async () => {
    const container = renderWithProvider(<Info />, {
      state: personalSignatureConfirmationState,
    });
    expect(container).toMatchSnapshot();
  });
});
