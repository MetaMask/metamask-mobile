import React from 'react';

import {
  siweSignatureConfirmationState,
  typedSignV1ConfirmationState,
} from '../../../../../../util/test/confirm-data-helpers';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import OriginRow from './origin-row';
import { approveERC20TransactionStateMock } from '../../../__mocks__/approve-transaction-mock';

describe('InfoRowOrigin', () => {
  it('renders origin', async () => {
    const { getByText } = renderWithProvider(<OriginRow />, {
      state: typedSignV1ConfirmationState,
    });
    expect(getByText('Request from')).toBeDefined();
    expect(getByText('metamask.github.io')).toBeDefined();
  });

  it('renders expected "Signing in with" information', async () => {
    const { getByText } = renderWithProvider(<OriginRow />, {
      state: siweSignatureConfirmationState,
    });
    expect(getByText('Signing in with')).toBeDefined();
    expect(getByText('0x935E7...05477')).toBeDefined();
  });

  it('does not render origin for wallet originated approvals', async () => {
    const { queryByText } = renderWithProvider(<OriginRow />, {
      // Wallet originated approval
      state: approveERC20TransactionStateMock,
    });
    expect(queryByText('Request from')).toBeNull();
  });
});
