import React from 'react';
import Share from 'react-native-share';

import { Alert, AlertButton } from 'react-native';

import { fireEvent, waitFor } from '@testing-library/react-native';

import renderWithProvider from '../../../util/test/renderWithProvider';

import Engine from '../../../core/Engine';
import Routes from '../../../constants/navigation/Routes';
import AccountActions from './AccountActions';
import { AccountActionsBottomSheetSelectorsIDs } from '../../../../e2e/selectors/wallet/AccountActionsBottomSheet.selectors';
import { backgroundState } from '../../../util/test/initial-root-state';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';

import { strings } from '../../../../locales/i18n';
import { act } from '@testing-library/react-hooks';
import { RPC } from '../../../constants/network';

// Mock the selectors
jest.mock('../../../selectors/tokensController', () => ({
  selectTokens: jest.fn(),
  selectTokensControllerState: jest.fn(),
  selectAllTokens: jest.fn(() => ({})),
}));

// Mock swaps selectors
jest.mock('../../../reducers/swaps', () => ({
  swapsControllerTokens: jest.fn(() => ({})),
  swapsControllerAndUserTokensMultichain: jest.fn(() => ({})),
}));

jest.mock('../../../selectors/networkController', () => ({
  selectProviderConfig: jest.fn(() => ({
    type: 'rpc',
    rpcUrl: 'https://custom-rpc.com',
    chainId: '0x1',
    ticker: 'ETH',
    nickname: 'Custom Network',
  })),
  selectNetworkConfigurations: jest.fn(() => ({
    'custom-network-id': {
      rpcUrl: 'https://custom-rpc.com',
      chainId: '0x1',
      ticker: 'ETH',
      blockExplorerUrl: 'https://custom-explorer.com',
    },
  })),
  selectChainId: jest.fn(() => '0x1'),
  selectEvmChainId: jest.fn(() => 1),
  selectSelectedInternalAccountAddress: jest.fn(
    () => '0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756',
  ),
}));

// Import the mocked selectors
import {
  selectProviderConfig,
  selectNetworkConfigurations,
} from '../../../selectors/networkController';

const initialState = {
  swaps: { '0x1': { isLive: true }, hasOnboarded: false, isLive: true },
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

jest.mock('../../../core/Engine', () => ({
  context: {
    PreferencesController: {
      selectedAddress: `0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756`,
    },
    KeyringController: {
      state: {
        keyrings: [
          {
            type: 'Ledger Hardware',
            accounts: ['0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756'],
          },
          {
            type: 'HD Key Tree',
            accounts: ['0xa1e359811322d97991e03f863a0c30c2cf029cd'],
          },
        ],
      },
      getAccounts: jest.fn(),
      removeAccount: jest.fn(),
    },
  },
  setSelectedAddress: jest.fn(),
}));

const mockEngine = jest.mocked(Engine);

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

// Create a mock account for use in tests
const MOCK_ACCOUNT = {
  address: '0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756',
  id: '123',
  metadata: {
    name: 'Account 2',
    importTime: 1684232000456,
    keyring: {
      type: 'HD Key Tree',
    },
  },
  options: {},
  methods: [
    'personal_sign',
    'eth_signTransaction',
    'eth_signTypedData_v1',
    'eth_signTypedData_v3',
    'eth_signTypedData_v4',
  ],
  type: 'eoa',
  scopes: ['eip155:1'],
};

// Create a mock Bitcoin account
const MOCK_BTC_ACCOUNT = {
  address: 'bc1qwl8399fz829uqvqly9tcatgrgtwp3udnhxfq4k',
  id: '456',
  metadata: {
    name: 'Bitcoin Account',
    importTime: 1684232000456,
    keyring: {
      type: 'HD Key Tree',
    },
  },
  options: {},
  methods: ['send_bitcoin'],
  type: 'p2wpkh',
  scopes: ['bip122:000000000019d6689c085ae165831e93'],
};

// Create a mock Solana account
const MOCK_SOLANA_ACCOUNT = {
  address: '7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
  id: '789',
  metadata: {
    name: 'Solana Account',
    importTime: 1684232000456,
    keyring: {
      type: 'HD Key Tree',
    },
  },
  options: {},
  methods: ['send_and_confirm_transaction'],
  type: 'data_account',
  scopes: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
};

// Mock the navigation module
jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
    useRoute: jest.fn(),
  };
});

// Import the mocked module to set implementation
import { useRoute } from '@react-navigation/native';
import { RootState } from '../../../reducers';

// Set the implementation after the mock is defined
const mockedUseRoute = jest.mocked(useRoute);
mockedUseRoute.mockImplementation(() => ({
  key: 'mock-key',
  name: 'mock-route',
  params: {
    selectedAccount: MOCK_ACCOUNT,
  },
}));

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { width: 0, height: 0, x: 0, y: 0 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
    useSafeAreaFrame: jest.fn().mockImplementation(() => frame),
  };
});

jest.mock('react-native-share', () => ({
  open: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../../core/Permissions', () => ({
  removeAccountsFromPermissions: jest.fn().mockResolvedValue(true),
}));

// Mock isEvmAccountType to return true for EVM accounts only
jest.mock('@metamask/keyring-api', () => {
  const original = jest.requireActual('@metamask/keyring-api');
  return {
    ...original,
    isEvmAccountType: jest.fn((type) => type === 'eoa'),
  };
});

// Mock network utility functions
jest.mock('../../../util/networks', () => {
  const original = jest.requireActual('../../../util/networks');
  return {
    ...original,
    findBlockExplorerForNonEvmAccount: jest.fn((account) => {
      if (account.type === 'p2wpkh') {
        return 'https://blockstream.info/address/bc1qwl8399fz829uqvqly9tcatgrgtwp3udnhxfq4k';
      } else if (account.type === 'data_account') {
        return 'https://explorer.solana.com/address/7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV';
      }
      return '';
    }),
    findBlockExplorerForRpc: jest.fn(() => 'https://custom-explorer.com'),
    getBlockExplorerName: jest.fn((url) => {
      if (url.includes('etherscan')) return 'etherscan.io';
      if (url.includes('blockstream.info')) return 'blockstream.info';
      if (url.includes('explorer.solana.com')) return 'explorer.solana.com';
      if (url.includes('custom-explorer.com')) return 'custom-explorer.com';
      return 'Block Explorer';
    }),
  };
});

// Create a state with custom RPC for testing
const customRpcState = {
  ...initialState,
  engine: {
    ...initialState.engine,
    backgroundState: {
      ...initialState.engine.backgroundState,
      NetworkController: {
        providerConfig: {
          type: RPC,
          rpcUrl: 'https://custom-rpc.com',
          chainId: '0x1',
          ticker: 'ETH',
          nickname: 'Custom Network',
        },
      },
      NetworksController: {
        networkConfigurations: {
          'custom-network-id': {
            rpcUrl: 'https://custom-rpc.com',
            chainId: '0x1',
            ticker: 'ETH',
            blockExplorerUrl: 'https://custom-explorer.com',
          },
        },
      },
    },
  },
} as unknown;

describe('AccountActions', () => {
  const mockKeyringController = mockEngine.context.KeyringController;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert');
  });

  it('renders all actions', () => {
    const { getByTestId } = renderWithProvider(<AccountActions />, {
      state: initialState,
    });

    expect(
      getByTestId(AccountActionsBottomSheetSelectorsIDs.EDIT_ACCOUNT),
    ).toBeDefined();
    expect(
      getByTestId(AccountActionsBottomSheetSelectorsIDs.VIEW_ETHERSCAN),
    ).toBeDefined();
    expect(
      getByTestId(AccountActionsBottomSheetSelectorsIDs.SHARE_ADDRESS),
    ).toBeDefined();
    expect(
      getByTestId(AccountActionsBottomSheetSelectorsIDs.SHOW_PRIVATE_KEY),
    ).toBeDefined();
  });

  it('navigates to webview when View on Etherscan is clicked', () => {
    // Set up the mock selectors for this test
    const mockProviderConfig = {
      type: 'mainnet',
      rpcUrl: '',
      chainId: '0x1',
      ticker: 'ETH',
      nickname: '',
    };

    (selectProviderConfig as unknown as jest.Mock).mockReturnValue(
      mockProviderConfig,
    );

    const { getByTestId } = renderWithProvider(<AccountActions />, {
      state: initialState,
    });

    fireEvent.press(
      getByTestId(AccountActionsBottomSheetSelectorsIDs.VIEW_ETHERSCAN),
    );

    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: 'https://etherscan.io/address/0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756',
        title: 'etherscan.io',
      },
    });
  });

  it('navigates to webview with custom RPC explorer when View on Block Explorer is clicked', () => {
    // Set up the mock selectors for this test
    const mockProviderConfig = {
      type: RPC,
      rpcUrl: 'https://custom-rpc.com',
      chainId: '0x1',
      ticker: 'ETH',
      nickname: 'Custom Network',
    };

    const mockNetworkConfigurations = {
      'custom-network-id': {
        rpcUrl: 'https://custom-rpc.com',
        chainId: '0x1',
        ticker: 'ETH',
        blockExplorerUrl: 'https://custom-explorer.com',
      },
    };

    (selectProviderConfig as unknown as jest.Mock).mockReturnValue(
      mockProviderConfig,
    );
    (selectNetworkConfigurations as unknown as jest.Mock).mockReturnValue(
      mockNetworkConfigurations,
    );

    const { getByTestId } = renderWithProvider(<AccountActions />, {
      state: customRpcState as Partial<RootState>,
    });

    fireEvent.press(
      getByTestId(AccountActionsBottomSheetSelectorsIDs.VIEW_ETHERSCAN),
    );

    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: 'https://custom-explorer.com/address/0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756',
        title: 'custom-explorer.com',
      },
    });
  });

  it('navigates to webview with Bitcoin block explorer when View on Block Explorer is clicked', () => {
    // Mock useRoute to return a Bitcoin account
    mockedUseRoute.mockImplementationOnce(() => ({
      key: 'mock-key',
      name: 'mock-route',
      params: {
        selectedAccount: MOCK_BTC_ACCOUNT,
      },
    }));

    const { getByTestId } = renderWithProvider(<AccountActions />, {
      state: initialState,
    });

    fireEvent.press(
      getByTestId(AccountActionsBottomSheetSelectorsIDs.VIEW_ETHERSCAN),
    );

    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: 'https://blockstream.info/address/bc1qwl8399fz829uqvqly9tcatgrgtwp3udnhxfq4k',
        title: 'blockstream.info',
      },
    });
  });

  it('navigates to webview with Solana block explorer when View on Block Explorer is clicked', () => {
    // Mock useRoute to return a Solana account
    mockedUseRoute.mockImplementationOnce(() => ({
      key: 'mock-key',
      name: 'mock-route',
      params: {
        selectedAccount: MOCK_SOLANA_ACCOUNT,
      },
    }));

    const { getByTestId } = renderWithProvider(<AccountActions />, {
      state: initialState,
    });

    fireEvent.press(
      getByTestId(AccountActionsBottomSheetSelectorsIDs.VIEW_ETHERSCAN),
    );

    expect(mockNavigate).toHaveBeenCalledWith('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: 'https://explorer.solana.com/address/7EcDhSYGxXyscszYEp35KHN8vvw3svAuLKTzXwCFLtV',
        title: 'explorer.solana.com',
      },
    });
  });

  it('opens the Share sheet when Share my public address is clicked', () => {
    const { getByTestId } = renderWithProvider(<AccountActions />, {
      state: initialState,
    });

    fireEvent.press(
      getByTestId(AccountActionsBottomSheetSelectorsIDs.SHARE_ADDRESS),
    );

    expect(Share.open).toHaveBeenCalledWith({
      message: '0xC4966c0D659D99699BFD7EB54D8fafEE40e4a756',
    });
  });

  it('navigates to the export private key screen when Show private key is clicked', () => {
    const { getByTestId } = renderWithProvider(<AccountActions />, {
      state: initialState,
    });

    fireEvent.press(
      getByTestId(AccountActionsBottomSheetSelectorsIDs.SHOW_PRIVATE_KEY),
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL,
      {
        credentialName: 'private_key',
        shouldUpdateNav: true,
        selectedAccount: MOCK_ACCOUNT,
      },
    );
  });

  it('clicks edit account', () => {
    const { getByTestId } = renderWithProvider(<AccountActions />, {
      state: initialState,
    });

    fireEvent.press(
      getByTestId(AccountActionsBottomSheetSelectorsIDs.EDIT_ACCOUNT),
    );

    expect(mockNavigate).toHaveBeenCalledWith('EditAccountName', {
      selectedAccount: MOCK_ACCOUNT,
    });
  });

  describe('clicks remove account', () => {
    it('clicks remove button after popup shows to trigger the remove account process', async () => {
      mockKeyringController.getAccounts.mockResolvedValue([
        '0xa1e359811322d97991e03f863a0c30c2cf029cd',
      ]);

      const { getByTestId, getByText } = renderWithProvider(
        <AccountActions />,
        {
          state: initialState,
        },
      );

      fireEvent.press(
        getByTestId(
          AccountActionsBottomSheetSelectorsIDs.REMOVE_HARDWARE_ACCOUNT,
        ),
      );

      const alertFnMock = Alert.alert as jest.MockedFn<typeof Alert.alert>;

      expect(alertFnMock).toHaveBeenCalled();

      //Check Alert title and description match.
      expect(alertFnMock.mock.calls[0][0]).toBe(
        strings('accounts.remove_hardware_account'),
      );
      expect(alertFnMock.mock.calls[0][1]).toBe(
        strings('accounts.remove_hw_account_alert_description'),
      );

      //Click remove button
      await act(async () => {
        const alertButtons = alertFnMock.mock.calls[0][2] as AlertButton[];
        if (alertButtons[1].onPress !== undefined) {
          alertButtons[1].onPress();
        }
      });

      await waitFor(() => {
        expect(getByText(strings('common.please_wait'))).toBeDefined();
      });
    });
  });
});
