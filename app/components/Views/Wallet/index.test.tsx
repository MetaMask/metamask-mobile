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
import { AccountsControllerState } from '@metamask/accounts-controller';

const mockEngine = Engine;

const mockAccountsControllerState: AccountsControllerState = {
  internalAccounts: {
    accounts: {
      '30313233-3435-4637-b839-383736353430': {
        // lowercase version for extra testing
        address: '0xc4955c0d639d99699bfd7ec54d9fafee40e4d272',
        id: '30313233-3435-4637-b839-383736353430',
        options: {},
        metadata: {
          name: 'Account 1',
          keyring: {
            type: 'HD Key Tree',
          },
        },
        methods: [
          'personal_sign',
          'eth_sign',
          'eth_signTransaction',
          'eth_signTypedData_v1',
          'eth_signTypedData_v3',
          'eth_signTypedData_v4',
        ],
        type: 'eip155:eoa',
      },
    },
    selectedAccount: '30313233-3435-4637-b839-383736353430',
  },
};

jest.mock('../../../core/Engine', () => ({
  init: () => mockEngine.init({}),
  getTotalFiatAccountBalance: jest.fn(),
  context: {
    PreferencesController: {
      selectedAddress: '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272',
      identities: {
        '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272': {
          name: 'Account 1',
          address: '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272',
        },
      },
    },
    NftController: {
      allNfts: {
        '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272': {
          '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272': [],
        },
      },
      allNftContracts: {
        '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272': {
          '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272': [],
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
      ...mockAccountsControllerState,
    },
  },
}));

const mockInitialState = {
  swaps: {
    '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272': { isLive: true },
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
        selectedAddress: '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272',
        identities: {
          '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272': {
            name: 'Account 1',
            address: '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272',
          },
        },
      },
      AccountsController: {
        ...mockAccountsControllerState,
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
