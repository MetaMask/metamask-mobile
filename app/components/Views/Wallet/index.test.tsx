import React from 'react';
import { shallow } from 'enzyme';
import Wallet from './';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import { renderScreen } from '../../../util/test/renderWithProvider';
import { screen } from '@testing-library/react-native';
import Engine from '../../../core/Engine';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import Routes from '../../../constants/navigation/Routes';
import initialBackgroundState from '../../../util/test/initial-background-state.json';

const mockEngine = Engine;

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
      allNfts: { '0x': { '0x1': [] } },
      allNftContracts: { '0x': { '0x1': [] } },
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
    KeyringController: {
      state: {
        keyrings: [
          {
            accounts: ['0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272'],
          },
        ],
      },
    },
  },
}));

const mockInitialState = {
  networkOnboarded: {
    networkOnboardedState: {
      '0x1': true,
    },
  },
  swaps: { '0x1': { isLive: true }, hasOnboarded: false, isLive: true },
  wizard: {
    step: 0,
  },
  settings: {
    primaryCurrency: 'usd',
  },
  engine: {
    backgroundState: {
      ...initialBackgroundState,
      PreferencesController: {
        selectedAddress: '0x',
        identities: {
          '0x': { name: 'Account 1', address: '0x' },
        },
      },
    },
  },
};

const mockStore = configureMockStore();
const store = mockStore(mockInitialState);

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest
    .fn()
    .mockImplementation((callback) => callback(mockInitialState)),
}));

jest.mock('react-native-scrollable-tab-view', () => {
  const ScrollableTabViewMock = jest
    .fn()
    .mockImplementation(() => ScrollableTabViewMock);
  // TODO - Clean up mock.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
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
      state: mockInitialState,
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
  it('should render fox icon', () => {
    render(Wallet);
    const foxIcon = screen.getByTestId('fox-icon');
    expect(foxIcon).toBeDefined();
  });
});
