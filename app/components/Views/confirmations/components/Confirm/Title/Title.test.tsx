import React from 'react';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { personalSignatureConfirmationState, siweSignatureConfirmationState } from '../../../../../../util/test/confirm-data-helpers';
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

  it('should render correct title and subtitle for personal siwe request', async () => {
    const { getByText } = renderWithProvider(<Title />, {
      state: siweSignatureConfirmationState,
    });
    expect(getByText('Sign-in request')).toBeDefined();
    expect(
      getByText('A site wants you to sign in to prove you own this account.'),
    ).toBeDefined();
  });
});
