import React from 'react';

import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { personalSignatureConfirmationState } from '../../../../../../../util/test/confirm-data-helpers';
import PersonalSign from './PersonalSign';

describe('PersonalSign', () => {
  it('should render correctly', async () => {
    const { getByText } = renderWithProvider(<PersonalSign />, {
      state: personalSignatureConfirmationState,
    });
    expect(getByText('Request from')).toBeDefined();
    expect(getByText('metamask.github.io')).toBeDefined();
    expect(getByText('Message')).toBeDefined();
    expect(getByText('Example `personal_sign` message')).toBeDefined();
  });
});
