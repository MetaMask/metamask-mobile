import React from 'react';

import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { typedSignV1ConfirmationState } from '../../../../../../../util/test/confirm-data-helpers';
import TypedSignV1 from './TypedSignV3V4';

describe('TypedSignV3V4', () => {
  it('should contained required text', async () => {
    const { getByText } = renderWithProvider(<TypedSignV1 />, {
      state: typedSignV1ConfirmationState,
    });
    expect(getByText('Request from')).toBeDefined();
    expect(getByText('metamask.github.io')).toBeDefined();
  });
});
