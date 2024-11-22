import React from 'react';

import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { personalSignatureConfirmationState } from '../../../../../../../util/test/confirm-data-helpers';
import PersonalSign from './PersonalSign';

describe('PersonalSign', () => {
  it('should match snapshot', async () => {
    const container = renderWithProvider(<PersonalSign />, {
      state: personalSignatureConfirmationState,
    });
    expect(container).toMatchSnapshot();
  });
});
