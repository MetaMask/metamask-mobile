import React from 'react';
import { screen } from '@testing-library/react-native';
import { shallow } from 'enzyme';
import Wallet from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { renderScreen } from '../../../util/test/renderWithProvider';
import Engine from '../../../core/Engine';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import Routes from '../../../constants/navigation/Routes';

const mockEngine = Engine;

jest.unmock('react-redux');

jest.mock('../../../core/Engine', () => ({
  init: () => mockEngine.init({}),
  getTotalFiatAccountBalance: jest.fn(),
  context: {
    PreferencesController: {
      selectedAddress: '0x',
      identities: {
        '0x': { name: 'Account 1', address: '0x' },
      },
    },
    NftController: {
      allNfts: { '0x': { '1': [] } },
      allNftContracts: { '0x': { '1': [] } },
    },
    TokenRatesController: {
      poll: jest.fn(),
    },
    TokenDetectionController: {
      detectTokens: jest.fn(),
    },
    NftDetectionController: {
      detectNfts: jest.fn(),
    },
    AccountTrackerController: {
      refresh: jest.fn(),
    },
  },
}));

const initialState = {
  swaps: { '1': { isLive: true }, hasOnboarded: false, isLive: true },
  wizard: {
    step: 0,
  },
  settings: {
    primaryCurrency: 'usd',
  },
  engine: {
    backgroundState: {
      SwapsController: {
        tokens: [],
      },
      AccountTrackerController: {
        accounts: {
          '0x': {
            name: 'account 1',
            address: '0x',
            balance: '0x0',
          },
        },
      },
      NetworkController: {
        providerConfig: {
          type: 'mainnet',
          nickname: 'Ethereum mainnet',
          ticket: 'eth',
          chainId: '1',
        },
      },
      CurrencyRateController: {
        conversionRate: 5,
        currentCurrency: 'usd',
      },
      TokensController: {
        tokens: [],
      },
      PreferencesController: {
        selectedAddress: '0x',
        identities: {
          '0x': { name: 'Account 1', address: '0x' },
        },
      },
      TokenBalancesController: {
        contractBalances: {},
      },
      TokenListController: {
        tokenList: {},
      },
      TokenRatesController: {
        contractExchangeRates: {},
      },
      NftController: {
        allNfts: { '0x': { '1': [] } },
        allNftContracts: { '0x': { '1': [] } },
      },
    },
  },
};

const mockStore = configureMockStore();
const store = mockStore(initialState);

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest
    .fn()
    .mockImplementation((callback) => callback(initialState)),
}));

jest.mock('react-native-scrollable-tab-view', () => {
  const ScrollableTabViewMock = jest
    .fn()
    .mockImplementation(() => ScrollableTabViewMock);

  ScrollableTabViewMock.defaultProps = {
    onChangeTab: jest.fn(),
    renderTabBar: jest.fn(),
  };
  return ScrollableTabViewMock;
});

const render = (Component: React.ComponentType) =>
  renderScreen(
    Component,
    {
      name: Routes.WALLET_VIEW,
    },
    {
      state: initialState,
    },
  );

describe('Wallet', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <Wallet />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
  it('should render scan qr icon', () => {
    render(Wallet);
    const scanButton = screen.getByTestId('wallet-scan-button');
    expect(scanButton).toBeDefined();
  });
  it('should render ScrollableTabView', () => {
    render(Wallet);
    expect(ScrollableTabView).toHaveBeenCalled();
  });
});
