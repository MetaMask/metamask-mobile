import React from 'react';
import { ConnectedComponent } from 'react-redux';
import { waitFor } from '@testing-library/react-native';
import Confirm from '.';
import { renderScreen } from '../../../../util/test/renderWithProvider';
import Routes from '../../../../constants/navigation/Routes';

const initialState = {
  engine: {
    backgroundState: {
      NetworkController: {
        network: '1',
        providerConfig: {
          ticker: 'ETH',
          type: 'mainnet',
        },
      },
      AddressBookController: {
        addressBook: {},
      },
      AccountTrackerController: {
        accounts: { '0x2': { balance: '0' } },
      },
      TransactionController: {
        transactions: [],
      },
      TokenRatesController: {
        contractExchangeRates: {},
      },
      CurrencyRateController: {
        currentCurrency: 'USD',
        conversionRate: 1,
      },
      TokenBalancesController: {
        contractBalances: {},
      },
      PreferencesController: {
        identities: {
          '0x1': { name: 'Account1' },
        },
      },
      KeyringController: {
        keyrings: [{ accounts: ['0x'], type: 'HD Key Tree' }],
      },
      GasFeeController: {
        gasFeeEstimates: {},
      },
    },
  },
  settings: {
    showHexData: true,
  },
  transaction: {
    selectedAsset: {},
    transaction: {
      from: '0x1',
      to: '0x2',
      value: '0x2',
    },
  },
  fiatOrders: {
    networks: [
      {
        active: true,
        chainId: 1,
        chainName: 'Ethereum Mainnet',
        nativeTokenSupported: true,
      },
    ],
  },
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest
    .fn()
    .mockImplementation((callback) => callback(initialState)),
}));
jest.mock('../../../../core/GasPolling/GasPolling', () => ({
  ...jest.requireActual('../../../../core/GasPolling/GasPolling'),
  startGasPolling: jest.fn(),
  stopGasPolling: jest.fn(),
}));
jest.mock('../../../../util/ENSUtils', () => ({
  ...jest.requireActual('../../../../util/ENSUtils'),
  doENSReverseLookup: jest.fn(),
}));
jest.mock('../../../../util/address', () => ({
  ...jest.requireActual('../../../../util/address'),
  isQRHardwareAccount: jest.fn(),
}));
jest.mock('../../../../core/Engine', () => ({
  context: {
    TokensController: {
      addToken: jest.fn(),
    },
  },
}));
jest.mock('../../../../util/custom-gas', () => ({
  ...jest.requireActual('../../../../util/custom-gas'),
  getGasLimit: jest.fn(),
}));
jest.mock('../../../../util/transactions', () => ({
  ...jest.requireActual('../../../../util/transactions'),
  decodeTransferData: jest.fn().mockImplementation(() => ['0x2']),
}));

function render(Component: React.ComponentType | ConnectedComponent<any, any>) {
  return renderScreen(
    Component,
    {
      name: Routes.SEND_FLOW.CONFIRM,
    },
    {
      state: initialState,
    },
  );
}

describe('Confirm', () => {
  it('should render correctly', async () => {
    const wrapper = render(Confirm);
    await waitFor(() => {
      expect(wrapper).toMatchSnapshot();
    });
  });
});
