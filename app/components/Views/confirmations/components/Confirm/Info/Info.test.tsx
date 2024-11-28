import React from 'react';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { personalSignatureConfirmationState } from '../../../../../../util/test/confirm-data-helpers';
import Info from './Info';

describe('Info', () => {
  it('should render correctly for personal sign', async () => {
    const { getByText } = renderWithProvider(<Info />, {
      state: personalSignatureConfirmationState,
    });
    expect(getByText('Message')).toBeDefined();
    expect(getByText('Example `personal_sign` message')).toBeDefined();
  });
});
