import React from 'react';

import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import {
  personalSignatureConfirmationState,
  siweSignatureConfirmationState,
} from '../../../../../../../util/test/confirm-data-helpers';
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

  it('should render tos statement for SIWE', async () => {
    const { getByText } = renderWithProvider(<PersonalSign />, {
      state: siweSignatureConfirmationState,
    });
    expect(
      getByText(
        'I accept the MetaMask Terms of Service: https://community.metamask.io/tos',
      ),
    ).toBeDefined();
  });
});
