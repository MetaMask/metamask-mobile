import React from 'react';
import { merge } from 'lodash';

import {
  generateContractInteractionState,
  siweSignatureConfirmationState,
  typedSignV1ConfirmationState,
  mockTxId,
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
    expect(getByText('0x8Eeee...73D12')).toBeDefined();
  });

  it('does not render origin for wallet originated approvals', async () => {
    const { queryByText } = renderWithProvider(<OriginRow />, {
      // Wallet originated approval
      state: approveERC20TransactionStateMock,
    });
    expect(queryByText('Request from')).toBeNull();
  });

  // Bug: https://github.com/MetaMask/metamask-mobile/issues/30401
  // When a transaction is requested from a dapp opened in an external
  // browser, the wallet receives the request via the `ethereum:` deeplink
  // path and the resulting transaction has `origin === 'deeplink'`. The
  // dapp's identity isn't verifiable, so we display a generic
  // "External app" label instead of the raw constant. The same applies
  // to QR-scanned `ethereum:` URLs (`origin === 'qr-code'`).
  it.each([
    ['deeplink', 'deeplink'],
    ['QR-code', 'qr-code'],
  ])(
    'renders "External app" instead of the raw origin for %s transactions',
    (_label, origin) => {
      const externalAppConfirmationState = merge(
        {},
        generateContractInteractionState,
        {
          engine: {
            backgroundState: {
              ApprovalController: {
                pendingApprovals: {
                  [mockTxId]: { origin },
                },
              },
              TransactionController: {
                transactions: [{ id: mockTxId, origin }],
              },
            },
          },
        },
      );

      const { getByText, queryByText } = renderWithProvider(<OriginRow />, {
        state: externalAppConfirmationState,
      });

      expect(getByText('Request from')).toBeDefined();
      expect(getByText('External app')).toBeDefined();
      expect(queryByText(origin)).toBeNull();
    },
  );
});
