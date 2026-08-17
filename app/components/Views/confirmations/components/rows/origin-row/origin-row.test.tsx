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

      expect(getByText('Request from')).toBeOnTheScreen();
      expect(getByText('External app')).toBeOnTheScreen();
      expect(queryByText(origin)).not.toBeOnTheScreen();
    },
  );

  // WalletConnect / SDK v1 / MetaMask Connect transactions carry the dapp's
  // self-reported domain as `origin`, which is unverifiable and must not be
  // presented as if the wallet had verified it. The transport is stored in
  // the confirmationMetrics slice keyed by transaction id (transactions
  // cannot carry client-only fields on TransactionMeta), and the row must
  // read it and render "External app" instead of the self-reported domain.
  it.each([
    ['WalletConnect', 'WalletConnect'],
    ['SDK v1', 'MetaMask-SDK-Remote-Conn'],
    ['MetaMask Connect', 'MetaMask-Connect'],
  ])(
    'renders "External app" for %s transactions with a self-reported domain origin',
    (_label, requestSource) => {
      const selfReportedOrigin = 'https://innocent-looking.example';
      const externalAppConfirmationState = merge(
        {},
        generateContractInteractionState,
        {
          engine: {
            backgroundState: {
              ApprovalController: {
                pendingApprovals: {
                  [mockTxId]: { origin: selfReportedOrigin },
                },
              },
              TransactionController: {
                transactions: [{ id: mockTxId, origin: selfReportedOrigin }],
              },
            },
          },
          confirmationMetrics: {
            metricsById: {
              [mockTxId]: {
                properties: { request_source: requestSource },
              },
            },
          },
        },
      );

      const { getByText, queryByText } = renderWithProvider(<OriginRow />, {
        state: externalAppConfirmationState,
      });

      expect(getByText('Request from')).toBeOnTheScreen();
      expect(getByText('External app')).toBeOnTheScreen();
      expect(queryByText(selfReportedOrigin)).not.toBeOnTheScreen();
    },
  );

  it('keeps the verified origin when no external transport is recorded', () => {
    const inAppBrowserState = merge({}, generateContractInteractionState, {
      confirmationMetrics: {
        metricsById: {
          [mockTxId]: {
            properties: { request_source: 'In-App-Browser' },
          },
        },
      },
    });

    const { getByText } = renderWithProvider(<OriginRow />, {
      state: inAppBrowserState,
    });

    expect(getByText('Request from')).toBeOnTheScreen();
    expect(getByText('metamask.github.io')).toBeOnTheScreen();
  });
});
