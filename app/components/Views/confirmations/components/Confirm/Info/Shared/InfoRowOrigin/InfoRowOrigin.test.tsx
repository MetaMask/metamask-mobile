import React from 'react';

import { renderWithConfirmProvider } from '../../../../../../../../util/test/renderWithConfirmProvider';
import {
  siweSignatureConfirmationState,
  typedSignV1ConfirmationState,
} from '../../../../../../../../util/test/confirm-data-helpers';
import InfoRowOrigin from './InfoRowOrigin';

describe('InfoRowOrigin', () => {
  it('should contained required text', async () => {
    const { getByText } = renderWithConfirmProvider(<InfoRowOrigin />, {
      state: typedSignV1ConfirmationState,
    });
    expect(getByText('Request from')).toBeDefined();
    expect(getByText('metamask.github.io')).toBeDefined();
  });

  it('should display signing in with information for SIWE sign request', async () => {
    const { getByText } = renderWithConfirmProvider(<InfoRowOrigin />, {
      state: siweSignatureConfirmationState,
    });
    expect(getByText('Signing in with')).toBeDefined();
    expect(getByText('0x935E7...05477')).toBeDefined();
  });
});
