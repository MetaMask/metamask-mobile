import React from 'react';
import SendTo from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import { shallow } from 'enzyme';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigation: {},
  }),
  useRoute: () => ({
    route: {},
  }),
  createNavigatorFactory: () => ({}),
}));

const mockStore = configureMockStore();
const initialState = {
  engine: {
    backgroundState: {
      NetworkController: {
        network: '1',
        providerConfig: {
          ticker: 'ETH',
          type: 'mainnet',
          chainId: '1',
        },
      },
      AccountTrackerController: {
        accounts: { '0x2': { balance: '0' } },
      },
      AddressBookController: {
        addressBook: {
          '0x51239E13Fe029cD52asA8babEBafb6814bc8Ba4b': {
            address: '0x51239E13Fe029cD52asA8babEBafb6814bc8Ba4b',
            chainId: '1',
            isEns: false,
            memo: '',
            name: 'aa',
          },
        },
      },
      PreferencesController: {
        identities: {
          '0x51239E13Fe029cD52asA8babEBafb6814bc8Ba4b': {
            address: '0x51239E13Fe029cD52asA8babEBafb6814bc8Ba4b',
            name: 'Account 1',
          },
        },
        selectedAddress: '0x51239E13Fe029cD52asA8babEBafb6814bc8Ba4b',
      },
      TransactionController: {
        transactions: [],
      },
      TokensController: {
        tokens: [],
      },
      TokenRatesController: {
        contractExchangeRates: {},
      },
      CurrencyRateController: {
        currentCurrency: 'USD',
        conversionRate: 1,
      },
      TokenBalancesController: {
        contractBalance: {},
      },
      KeyringController: {
        keyrings: [{ accounts: ['0x'], type: 'HD Key Tree' }],
      },
    },
  },
  settings: {
    primaryCurrency: 'fiat',
  },
  transaction: {
    selectedAsset: {},
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
const store = mockStore(initialState);

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest
    .fn()
    .mockImplementation((callback) => callback(initialState)),
}));

describe('SendTo', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <SendTo />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
