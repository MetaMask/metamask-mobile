import React from 'react';

import renderWithProvider from '../../../../../../../../util/test/renderWithProvider';
import { typedSignV1ConfirmationState } from '../../../../../../../../util/test/confirm-data-helpers';
import InfoRowOrigin from './InfoRowOrigin';

describe('InfoRowOrigin', () => {
  it('should contained required text', async () => {
    const { getByText } = renderWithProvider(<InfoRowOrigin />, {
      state: typedSignV1ConfirmationState,
    });
    expect(getByText('Request from')).toBeDefined();
    expect(getByText('metamask.github.io')).toBeDefined();
  });
});
