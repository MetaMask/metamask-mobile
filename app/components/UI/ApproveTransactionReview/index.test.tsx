import React from 'react';
import { shallow } from 'enzyme';
import ApproveTransactionModal from './';
import configureMockStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import renderWithProvider from '../../../util/test/renderWithProvider';

jest.mock('@react-navigation/compat', () => {
  const actualNav = jest.requireActual('@react-navigation/compat');
  return {
    actualNav,
    withNavigation: (obj: any) => obj,
  };
});

jest.mock('react-native-keyboard-aware-scroll-view', () => {
  const KeyboardAwareScrollView = jest.requireActual('react-native').ScrollView;
  return { KeyboardAwareScrollView };
});

const mockState = {
  engine: {
    backgroundState: {
      AccountTrackerController: {
        accounts: {
          '0x0': { balance: '0x2' },
          '0x1': { balance: '0x5' },
          '0x2': { balance: '0' },
        },
      },
      CurrencyRateController: {
        conversionRate: 5,
      },
      NetworkController: {
        providerConfig: {
          chainId: '0xaa36a7',
          type: 'sepolia',
          nickname: 'Sepolia',
        },
        provider: {
          ticker: 'eth',
        },
      },
      TokensController: {
        tokens: [],
      },
      PreferencesController: { frequentRpcList: ['http://10.0.2.2:8545'] },
      TokenListController: {
        tokenList: {},
      },
      GasFeeController: {
        gasEstimates: {},
      },
      TokenRatesController: {
        contractExchangeRates: {
          '0x0': 0.005,
          '0x01': 0.005,
          '0x02': 0.005,
        },
      },
      TokenBalancesController: {},
    },
  },
  transaction: {
    transaction: { from: '0x0', to: '0x1' },
    transactionTo: '0x1',
    selectedAsset: { isETH: true, address: '0x0', symbol: 'ETH', decimals: 8 },
    transactionToName: 'Account 2',
    transactionFromName: 'Account 1',
  },
  settings: {
    primaryCurrency: 'fiat',
  },
  browser: {
    activeTab: 1605778647042,
    tabs: [{ id: 1605778647042, url: 'https://metamask.github.io/test-dapp/' }],
  },
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (fn: any) => fn(mockState),
}));

const mockStore = configureMockStore();
const store = mockStore(mockState);

describe('ApproveTransactionModal', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <ApproveTransactionModal />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });

  it('should match snapshot', () => {
    const container = renderWithProvider(<ApproveTransactionModal />, {
      state: mockState,
    });
    expect(container).toMatchSnapshot();
  });
});
