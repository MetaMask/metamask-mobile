import React from 'react';
import Confirm from '.';
import renderWithProvider from '../../../../util/test/renderWithProvider';

jest.mock('../../../../util/address', () => ({
  ...jest.requireActual('../../../../util/address'),
  isQRHardwareAccount: jest.fn(),
}));

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
        identities: {},
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

describe('Confirm', () => {
  it('should render correctly', () => {
    const wrapper = renderWithProvider(<Confirm />, { state: initialState });
    expect(wrapper).toMatchSnapshot();
  });
});
