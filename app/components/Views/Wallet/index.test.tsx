import React from 'react';
import { shallow } from 'enzyme';
import Wallet from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import renderWithProvider from '../../../util/test/renderWithProvider';
import Engine from '../../../core/Engine';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import { createStackNavigator } from '@react-navigation/stack';

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
  },
}));

// TODO: Convert STRINGs into a mock SVG component
jest.mock(
  '../../../component-library/components/Icons/Icon/assets/diagram.svg',
  () => 'STRINGs',
);

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
            balance: 0,
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

const mockNavigate = jest.fn();

const Stack = createStackNavigator();

const renderComponent = (state: any = {}) =>
  renderWithProvider(
    <Stack.Navigator>
      <Stack.Screen name="Wallet">
        {(props: any) => (
          <Wallet
            {...props}
            navigation={{
              navigate: mockNavigate,
              setOptions: jest.fn(),
              setParams: jest.fn(),
            }}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>,
    { state },
  );

describe('Wallet', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });
  it('should render correctly', () => {
    const wrapper = shallow(
      <Provider store={store}>
        <Wallet />
      </Provider>,
    );
    expect(wrapper).toMatchSnapshot();
  });
  // TODO - Fix test
  // it('should render Account Overview', () => {
  //   const { getByTestId } = renderComponent(initialState);

  //   expect(getByTestId('account-overview')).toBeDefined();
  // });
  it('should render scan qr icon', () => {
    // There is an open issue https://github.com/react-navigation/react-navigation/issues/9487
    // It's blocking the testing to the nav bar custom headear
  });
  it('should render ScrollableTabView', () => {
    renderComponent(initialState);
    expect(ScrollableTabView).toHaveBeenCalled();
  });
});
