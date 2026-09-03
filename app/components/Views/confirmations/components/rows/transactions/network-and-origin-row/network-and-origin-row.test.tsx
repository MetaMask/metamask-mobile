import React from 'react';
import { merge } from 'lodash';
import { Hex } from '@metamask/utils';

import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import {
  personalSignatureConfirmationState,
  transferConfirmationState,
} from '../../../../../../../util/test/confirm-data-helpers';
import AppConstants from '../../../../../../../core/AppConstants';
import { MMM_ORIGIN } from '../../../../constants/confirmations';
import { NetworkAndOriginRow } from './network-and-origin-row';

jest.mock('../../../../hooks/metrics/useConfirmationMetricEvents');
jest.mock('../../../../hooks/metrics/useConfirmationAlertMetrics', () => ({
  useConfirmationAlertMetrics: () => ({
    trackInlineAlertClicked: jest.fn(),
    trackAlertActionClicked: jest.fn(),
    trackAlertRendered: jest.fn(),
  }),
}));
jest.mock('../../../../../../../core/Engine', () => ({
  context: {
    GasFeeController: {
      startPolling: jest.fn(),
      stopPollingByPollingToken: jest.fn(),
    },
    NetworkController: {
      getNetworkConfigurationByNetworkClientId: jest.fn(),
    },
  },
}));

const MOCK_DAPP_ORIGIN = 'https://exampledapp.com';

// A bare connection UUID, as surfaced by MetaMask SDK (v1 channel id) and
// MetaMask Connect / MWP (v2 connection id) for the request origin.
const SDK_CONNECTION_UUID = 'a5ee1643-3832-4f04-9929-2dd008a36172';

const mockNetworkImage = { uri: 'https://mocknetwork.com/image.png' };
jest.mock('../../../../../../../util/networks', () => ({
  getNetworkImageSource: jest.fn(() => mockNetworkImage),
}));

const networkConfigurationMock = {
  name: 'Test Network',
  chainId: '0x1' as Hex,
};

// Mock state with transaction from MetaMask Mobile origin
const internalTransactionState = merge({}, transferConfirmationState, {
  engine: {
    backgroundState: {
      TransactionController: {
        transactions: [
          {
            txParams: {
              from: '0xdc47789de4ceff0e8fe9d15d728af7f17550c164',
            },
            origin: MMM_ORIGIN,
          },
        ],
      },
      NetworkController: {
        networkConfigurationsByChainId: {
          '0x1': networkConfigurationMock,
        },
      },
    },
  },
});

// Mock state with transaction from external dapp origin
const dappOriginTransactionState = merge({}, transferConfirmationState, {
  engine: {
    backgroundState: {
      TransactionController: {
        transactions: [
          {
            txParams: {
              from: '0xdc47789de4ceff0e8fe9d15d728af7f17550c164',
            },
            origin: MOCK_DAPP_ORIGIN,
          },
        ],
      },
      NetworkController: {
        networkConfigurationsByChainId: {
          '0x1': networkConfigurationMock,
        },
      },
    },
  },
});

// Mock state for transactions triggered via a path where the origin
// cannot be verified — an `ethereum:` deeplink from an external browser
// app, or an `ethereum:` URL scanned from a QR code.
const externalAppOriginTransactionState = (origin: string) =>
  merge({}, transferConfirmationState, {
    engine: {
      backgroundState: {
        TransactionController: {
          transactions: [
            {
              txParams: {
                from: '0xdc47789de4ceff0e8fe9d15d728af7f17550c164',
              },
              origin,
            },
          ],
        },
        NetworkController: {
          networkConfigurationsByChainId: {
            '0x1': networkConfigurationMock,
          },
        },
      },
    },
  });

// Override the origin (and optionally the transport `request_source`) on the
// pending personal-sign request. The id matches the pending approval /
// signature request keys in personalSignatureConfirmationState.
const signatureOriginState = (origin: string, requestSource?: string) =>
  merge({}, personalSignatureConfirmationState, {
    engine: {
      backgroundState: {
        SignatureController: {
          signatureRequests: {
            '76b33b40-7b5c-11ef-bc0a-25bce29dbc09': {
              messageParams: {
                origin,
                ...(requestSource
                  ? { meta: { analytics: { request_source: requestSource } } }
                  : {}),
              },
            },
          },
        },
      },
    },
  });

describe('NetworkAndOriginRow', () => {
  it('displays the correct network name', async () => {
    const { getByText } = renderWithProvider(<NetworkAndOriginRow />, {
      state: internalTransactionState,
    });

    expect(getByText('Test Network')).toBeDefined();
    expect(getByText('Network')).toBeDefined();
  });

  it('displays origin info for dapp transactions', async () => {
    const { getByText } = renderWithProvider(<NetworkAndOriginRow />, {
      state: dappOriginTransactionState,
    });

    expect(getByText('Test Network')).toBeDefined();
    expect(getByText('Request from')).toBeDefined();
    expect(getByText(MOCK_DAPP_ORIGIN)).toBeDefined();
  });

  it('does not display origin info for internal transactions', async () => {
    const { getByText, queryByText } = renderWithProvider(
      <NetworkAndOriginRow />,
      {
        state: internalTransactionState,
      },
    );

    expect(getByText('Test Network')).toBeDefined();
    expect(queryByText('Request from')).toBeNull();
    expect(queryByText(MMM_ORIGIN)).toBeNull();
  });

  it.each([
    ['deeplink', 'deeplink'],
    ['QR-code', 'qr-code'],
    // MetaMask SDK / MetaMask Connect (MWP) connections surface the request
    // origin as a bare connection UUID, which we cannot verify.
    ['SDK / MWP connection UUID', SDK_CONNECTION_UUID],
  ])(
    'displays "External app" instead of the raw origin for unverifiable %s origins',
    (_label, origin) => {
      const { getByText, queryByText } = renderWithProvider(
        <NetworkAndOriginRow />,
        {
          state: externalAppOriginTransactionState(origin),
        },
      );

      expect(getByText('Request from')).toBeOnTheScreen();
      expect(getByText('External app')).toBeOnTheScreen();
      expect(queryByText(origin)).not.toBeOnTheScreen();
    },
  );

  // Regression coverage for the signature path (e.g. an OpenSea "Sign-in
  // request" opened over MetaMask Connect / MWP). The origin here comes from
  // `signatureRequest.messageParams.origin`, not `transactionMetadata.origin`.
  describe('signature requests', () => {
    it('displays the verifiable dapp domain for in-app browser signatures', () => {
      const { getByText } = renderWithProvider(<NetworkAndOriginRow />, {
        state: personalSignatureConfirmationState,
      });

      expect(getByText('Request from')).toBeOnTheScreen();
      // personalSignatureConfirmationState uses a verifiable in-app browser origin.
      expect(getByText('metamask.github.io')).toBeOnTheScreen();
    });

    it('displays "External app" for an unverifiable SDK / MWP connection UUID origin', () => {
      const { getByText, queryByText } = renderWithProvider(
        <NetworkAndOriginRow />,
        { state: signatureOriginState(SDK_CONNECTION_UUID) },
      );

      expect(getByText('Request from')).toBeOnTheScreen();
      expect(getByText('External app')).toBeOnTheScreen();
      expect(queryByText(SDK_CONNECTION_UUID)).not.toBeOnTheScreen();
    });

    // The self-reported domain must NOT be shown for remote transports whose
    // origin we can't verify — even though it looks like a normal domain, the
    // `request_source` tells us it arrived over SDK v1 / MWP / WalletConnect.
    it.each([
      ['SDK v1', AppConstants.REQUEST_SOURCES.SDK_REMOTE_CONN],
      ['MetaMask Connect (MWP)', AppConstants.REQUEST_SOURCES.MM_CONNECT],
      ['WalletConnect', AppConstants.REQUEST_SOURCES.WC],
    ])(
      'displays "External app" for a self-reported %s domain origin',
      (_label, requestSource) => {
        const selfReportedDomain = 'opensea.io';
        const { getByText, queryByText } = renderWithProvider(
          <NetworkAndOriginRow />,
          { state: signatureOriginState(selfReportedDomain, requestSource) },
        );

        expect(getByText('Request from')).toBeOnTheScreen();
        expect(getByText('External app')).toBeOnTheScreen();
        expect(queryByText(selfReportedDomain)).not.toBeOnTheScreen();
      },
    );
  });
});
