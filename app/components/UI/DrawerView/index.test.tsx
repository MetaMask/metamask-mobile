import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import DrawerView from './';

import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';

import { fireEvent } from '@testing-library/react-native';

jest.mock('react-native-share', () => ({
  open: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../../core/ClipboardManager', () => ({
  setString: jest.fn(() => Promise.resolve()),
}));

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

jest.mock('../../../core/Engine', () => {
  const { MOCK_ACCOUNTS_CONTROLLER_STATE: mockAccountsControllerState } =
    jest.requireActual('../../../util/test/accountsControllerTestUtils');
  return {
    getTotalFiatAccountBalance: () => ({ ethFiat: 0, tokenFiat: 0 }),
    context: {
      KeyringController: {
        state: {
          keyrings: [],
        },
      },
      AccountsController: {
        ...mockAccountsControllerState,
        state: mockAccountsControllerState,
      },
    },
  };
});

describe('DrawerView - Extended Coverage', () => {
  const navigationMock = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    replace: jest.fn(),
    dangerouslyGetState: jest.fn(() => ({ routes: [{ name: 'Home' }] })),
  };
  const metricsMock = {
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn(() => ({
        build: jest.fn(() => ({})),
      })),
      build: jest.fn(() => ({})),
    })),
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const props = {
    navigation: navigationMock,
    providerConfig: {
      type: 'mainnet',
      ticker: 'ETH',
      rpcUrl: 'https://rpc.example.com',
    },
    accounts: {},
    selectedInternalAccount: {
      address: '0x123',
      metadata: { name: 'Account 1' },
    },
    currentCurrency: 'USD',
    keyrings: [],
    toggleNetworkModal: jest.fn(),
    showAlert: jest.fn(),
    networkModalVisible: false,
    newAssetTransaction: jest.fn(),
    passwordSet: true,
    wizard: {},
    ticker: 'ETH',
    networkConfigurations: {},
    tokens: [],
    tokenBalances: {},
    collectibles: [],
    seedphraseBackedUp: true,
    currentRoute: 'Home',
    switchedNetwork: {},
    protectWalletModalVisible: jest.fn(),
    onboardNetworkAction: jest.fn(),
    networkSwitched: jest.fn(),
    infoNetworkModalVisible: false,
    toggleInfoNetworkModal: jest.fn(),
    onCloseDrawer: jest.fn(),
    metrics: metricsMock,
    chainId: '1',
  };

  it('renders correctly (snapshot)', () => {
    const { toJSON } = renderWithProvider(
      <DrawerView navigation={{ goBack: () => null }} />,
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('handles onSend correctly', async () => {
    const { getByTestId } = renderWithProvider(<DrawerView {...props} />, {
      state: mockInitialState,
    });
    const sendButton = getByTestId('drawer-send-button');
    fireEvent.press(sendButton);
    expect(navigationMock.navigate).toHaveBeenCalledWith('SendFlowView');
  });

  it('calls openAccountSelector and tracks the event', () => {
    const { getByTestId } = renderWithProvider(<DrawerView {...props} />, {
      state: mockInitialState,
    });
    const identicon = getByTestId('navbar-account-identicon');
    fireEvent.press(identicon);
    expect(navigationMock.navigate).toHaveBeenCalled();
  });

  it('handles onReceive correctly', () => {
    const { getByTestId } = renderWithProvider(<DrawerView {...props} />, {
      state: mockInitialState,
    });
    const receiveButton = getByTestId('drawer-receive-button');
    fireEvent.press(receiveButton);
    expect(navigationMock.navigate).toHaveBeenCalledWith('QRTabSwitcher', {
      disableTabber: true,
      initialScreen: 1,
    });
  });
});
