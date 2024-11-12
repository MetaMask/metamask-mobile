import React from 'react';
import Wallet from './';
import { renderScreen } from '../../../util/test/renderWithProvider';
import { act, screen } from '@testing-library/react-native';
import ScrollableTabView from 'react-native-scrollable-tab-view';
import Routes from '../../../constants/navigation/Routes';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import { useAccountSyncing } from '../../../util/notifications/hooks/useAccountSyncing';
import { AppState } from 'react-native';

const MOCK_ADDRESS = '0xc4955c0d639d99699bfd7ec54d9fafee40e4d272';

jest.mock('../../../util/address', () => {
  const actual = jest.requireActual('../../../util/address');
  return {
    ...actual,
    getLabelTextByAddress: jest.fn(),
  };
});

jest.mock('../../../core/Engine', () => {
  const { MOCK_ACCOUNTS_CONTROLLER_STATE: mockAccountsControllerState } =
    jest.requireActual('../../../util/test/accountsControllerTestUtils');
  return {
    getTotalFiatAccountBalance: jest.fn(),
    context: {
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
        ...mockAccountsControllerState,
        state: mockAccountsControllerState,
      },
    },
  };
});

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
      ...backgroundState,
      AccountsController: {
        ...MOCK_ACCOUNTS_CONTROLLER_STATE,
      },
    },
  },
};

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

jest.mock('../../../util/notifications/hooks/useAccountSyncing', () => ({
  useAccountSyncing: jest.fn().mockReturnValue({
    dispatchAccountSyncing: jest.fn(),
    error: undefined,
  }),
}));

jest.mock('../../../util/address', () => ({
  ...jest.requireActual('../../../util/address'),
  getInternalAccountByAddress: jest.fn().mockReturnValue({
    address: MOCK_ADDRESS,
    balance: '0x0',
    name: 'Account 1',
    type: 'default',
    metadata: {
      keyring: {
        type: 'HD Key Tree',
      },
    },
  }),
}));

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
    //@ts-expect-error we are ignoring the navigation params on purpose because we do not want to mock setOptions to test the navbar
    const wrapper = render(Wallet);
    expect(wrapper.toJSON()).toMatchSnapshot();
  });
  it('should render scan qr icon', () => {
    //@ts-expect-error we are ignoring the navigation params on purpose because we do not want to mock setOptions to test the navbar
    render(Wallet);
    const scanButton = screen.getByTestId(
      WalletViewSelectorsIDs.WALLET_SCAN_BUTTON,
    );
    expect(scanButton).toBeDefined();
  });
  it('should render ScrollableTabView', () => {
    //@ts-expect-error we are ignoring the navigation params on purpose because we do not want to mock setOptions to test the navbar
    render(Wallet);
    expect(ScrollableTabView).toHaveBeenCalled();
  });
  it('should render the address copy button', () => {
    //@ts-expect-error we are ignoring the navigation params on purpose because we do not want to mock setOptions to test the navbar
    render(Wallet);
    const addressCopyButton = screen.getByTestId(
      WalletViewSelectorsIDs.NAVBAR_ADDRESS_COPY_BUTTON,
    );
    expect(addressCopyButton).toBeDefined();
  });
  it('should render the account picker', () => {
    //@ts-expect-error we are ignoring the navigation params on purpose because we do not want to mock setOptions to test the navbar
    render(Wallet);
    const accountPicker = screen.getByTestId(
      WalletViewSelectorsIDs.ACCOUNT_ICON,
    );
    expect(accountPicker).toBeDefined();
  });
  it('dispatches account syncing on mount', () => {
    jest.clearAllMocks();
    //@ts-expect-error we are ignoring the navigation params on purpose because we do not want to mock setOptions to test the navbar
    render(Wallet);
    expect(useAccountSyncing().dispatchAccountSyncing).toHaveBeenCalledTimes(1);
  });
  it('dispatches account syncing when appState switches from inactive|background to active', () => {
    jest.clearAllMocks();

    const addEventListener = jest.spyOn(AppState, 'addEventListener');

    //@ts-expect-error we are ignoring the navigation params on purpose because we do not want to mock setOptions to test the navbar
    render(Wallet);

    expect(addEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );
    const handleAppStateChange = (
      addEventListener as jest.Mock
    ).mock.calls.find(([event]) => event === 'change')[1];

    act(() => {
      handleAppStateChange('background');
      handleAppStateChange('active');
    });

    expect(useAccountSyncing().dispatchAccountSyncing).toHaveBeenCalledTimes(2);

    act(() => {
      handleAppStateChange('inactive');
      handleAppStateChange('active');
    });

    expect(useAccountSyncing().dispatchAccountSyncing).toHaveBeenCalledTimes(3);
  });
});
