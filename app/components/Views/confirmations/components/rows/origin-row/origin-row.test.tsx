import React from 'react';

import {
  siweSignatureConfirmationState,
  typedSignV1ConfirmationState,
} from '../../../../../../util/test/confirm-data-helpers';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { generateStablecoinLendingDepositConfirmationState } from '../../../__mocks__/controllers/transaction-batch-mock';
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

  it('should display signing in with information for stablecoin lending deposit', async () => {
    const { getByText } = renderWithProvider(
      <InfoRowOrigin isSignatureRequest={false} />,
      {
        state: generateStablecoinLendingDepositConfirmationState,
      },
    );
    expect(getByText('Request from')).toBeDefined();
    expect(getByText('metamask')).toBeDefined();
  });
});
