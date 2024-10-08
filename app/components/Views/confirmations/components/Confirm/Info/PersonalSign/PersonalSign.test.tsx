import React from 'react';

import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { personalSignatureConfirmationState } from '../../../../../../../util/test/confirm-data-helpers';
import Title from './index';

describe('Title', () => {
  it('should match snapshot', async () => {
    const container = renderWithProvider(<Title />, {
      state: personalSignatureConfirmationState,
    });
    expect(container).toMatchSnapshot();
  });
});
