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
import { createMockAccountsControllerState } from '../../../util/test/accountsControllerTestUtils';

const mockEngine = Engine;

const MOCK_ADDRESS = '0xc4955c0d639d99699bfd7ec54d9fafee40e4d272';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerState([
  MOCK_ADDRESS,
]);

jest.mock('../../../core/Engine', () => ({
  init: () => mockEngine.init({}),
  getTotalFiatAccountBalance: jest.fn(),
  context: {
    PreferencesController: {
      selectedAddress: MOCK_ADDRESS,
      identities: {
        [MOCK_ADDRESS]: {
          name: 'Account 1',
          address: MOCK_ADDRESS,
        },
      },
    },
    NftController: {
      allNfts: {
        [MOCK_ADDRESS]: {
          [MOCK_ADDRESS]: [],
        },
      },
      allNftContracts: {
        [MOCK_ADDRESS]: {
          [MOCK_ADDRESS]: [],
        },
      },
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
    AccountsController: {
      ...MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
}));

const mockInitialState = {
  networkOnboarded: {
    networkOnboardedState: {
      '0x1': true,
    },
  },
  security: {
    dataCollectionForMarketing: true,
  },
  swaps: {
    [MOCK_ADDRESS]: { isLive: true },
    hasOnboarded: false,
    isLive: true,
  },
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
        selectedAddress: MOCK_ADDRESS,
        identities: {
          [MOCK_ADDRESS]: {
            name: 'Account 1',
            address: MOCK_ADDRESS,
          },
        },
      },
      AccountsController: {
        ...MOCK_ACCOUNTS_CONTROLLER_STATE,
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
