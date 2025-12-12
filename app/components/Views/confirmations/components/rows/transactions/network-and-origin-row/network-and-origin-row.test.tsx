import React from 'react';
import { merge } from 'lodash';
import { Hex } from '@metamask/utils';

import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import { transferConfirmationState } from '../../../../../../../util/test/confirm-data-helpers';
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
});
