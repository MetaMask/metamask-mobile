import React from 'react';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { personalSignatureConfirmationState } from '../../../../../../util/test/confirm-data-helpers';
import Title from './Title';

describe('Title', () => {
  it('should render correct title and subtitle for personal sign request', async () => {
    const { getByText } = renderWithProvider(<Title />, {
      state: personalSignatureConfirmationState,
    });
    expect(getByText('Signature request')).toBeDefined();
    expect(
      getByText('Review request details before you confirm.'),
    ).toBeDefined();
  });
});
