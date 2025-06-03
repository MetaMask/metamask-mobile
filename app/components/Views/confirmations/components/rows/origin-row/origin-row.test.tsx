import React from 'react';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import {
  siweSignatureConfirmationState,
  typedSignV1ConfirmationState,
} from '../../../../../../util/test/confirm-data-helpers';
import InfoRowOrigin from './origin-row';

describe('InfoRowOrigin', () => {
  it('should contained required text', async () => {
    const { getByText } = renderWithProvider(
      <InfoRowOrigin isSignatureRequest />,
      {
        state: typedSignV1ConfirmationState,
      },
    );
    expect(getByText('Request from')).toBeDefined();
    expect(getByText('metamask.github.io')).toBeDefined();
  });

  it('should display signing in with information for SIWE sign request', async () => {
    const { getByText } = renderWithProvider(
      <InfoRowOrigin isSignatureRequest />,
      {
        state: siweSignatureConfirmationState,
      },
    );
    expect(getByText('Signing in with')).toBeDefined();
    expect(getByText('0x935E7...05477')).toBeDefined();
  });
});
