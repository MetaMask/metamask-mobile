import React from 'react';

import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { personalSignatureConfirmationState } from '../../../../../../../util/test/confirm-data-helpers';
import TypedSignV1 from './index';

describe('TypedSignV1', () => {
  it('should match snapshot', async () => {
    const container = renderWithProvider(<TypedSignV1 />, {
      state: personalSignatureConfirmationState,
    });
    expect(container).toMatchSnapshot();
  });
});
