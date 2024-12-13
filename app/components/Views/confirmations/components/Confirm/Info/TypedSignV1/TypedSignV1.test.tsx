import React from 'react';

import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { typedSignV1ConfirmationState } from '../../../../../../../util/test/confirm-data-helpers';
import TypedSignV1 from './TypedSignV1';

describe('TypedSignV1', () => {
  it('should contained required text', async () => {
    const { getByText, getAllByText } = renderWithProvider(<TypedSignV1 />, {
      state: typedSignV1ConfirmationState,
    });
    expect(getByText('Estimated changes')).toBeDefined();
    expect(
      getByText(
        'You’re signing into a site and there are no predicted changes to your account.',
      ),
    ).toBeDefined();
    expect(getByText('Request from')).toBeDefined();
    expect(getByText('metamask.github.io')).toBeDefined();
    expect(getAllByText('Message')).toHaveLength(2);
    expect(getByText('Hi, Alice!')).toBeDefined();
  });
});
