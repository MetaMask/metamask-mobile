import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import { KeyringTypes } from '@metamask/keyring-controller';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { EthScope } from '@metamask/keyring-api';
import { Account } from '../../hooks/useAccounts';
import renderWithProvider, {
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { RootState } from '../../../reducers';
import AccountPermissions from './AccountPermissions';
import { ConnectedAccountsSelectorsIDs } from '../AccountConnect/ConnectedAccountModal.testIds';
import { AccountPermissionsScreens } from './AccountPermissions.types';
import {
  updatePermittedChains,
  addPermittedAccounts,
  removePermittedAccounts,
} from '../../../core/Permissions';
import { NetworkConnectMultiSelectorSelectorsIDs } from '../NetworkConnect/NetworkConnectMultiSelector.testIds';
import { ConnectAccountBottomSheetSelectorsIDs } from '../AccountConnect/ConnectAccountBottomSheet.testIds';
import {
  Caip25CaveatType,
  Caip25EndowmentPermissionName,
} from '@metamask/chain-agnostic-permission';
import { Hex } from '@metamask/utils';
import Engine from '../../../core/Engine';
import { MAINNET_DISPLAY_NAME } from '../../../core/Engine/constants';

const MOCK_EVM_ACCOUNT_1 = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';
const MOCK_EVM_ACCOUNT_2 = '0xd018538C87232FF95acbCe4870629b75640a78E7';

const MOCK_EVM_ACCOUNT_1_ID = 'mock-account-id-1';
const MOCK_EVM_ACCOUNT_2_ID = 'mock-account-id-2';

const MOCK_EVM_ACCOUNT_1_NAME = 'Account 1';
const MOCK_EVM_ACCOUNT_2_NAME = 'Account 2';

const MOCK_EVM_ACCOUNT_1_CAIP_ACCOUNT_ID = `eip155:0:${MOCK_EVM_ACCOUNT_1}`;
const MOCK_EVM_ACCOUNT_2_CAIP_ACCOUNT_ID = `eip155:0:${MOCK_EVM_ACCOUNT_2}`;

const MOCK_EVM_CAIP_SCOPE_1 = EthScope.Eoa;

const MOCK_USE_ACCOUNTS_RETURN: Account[] = [
  {
    id: MOCK_EVM_ACCOUNT_1_ID,
    name: MOCK_EVM_ACCOUNT_1_NAME,
    address: MOCK_EVM_ACCOUNT_1,
    assets: {
      fiatBalance: '$3200.00\n1 ETH',
      tokens: [],
    },
    type: KeyringTypes.hd,
    yOffset: 0,
    isSelected: true,
    balanceError: undefined,
    caipAccountId: MOCK_EVM_ACCOUNT_1_CAIP_ACCOUNT_ID,
    isLoadingAccount: false,
    scopes: [MOCK_EVM_CAIP_SCOPE_1],
  },
  {
    id: MOCK_EVM_ACCOUNT_2_ID,
    name: MOCK_EVM_ACCOUNT_2_NAME,
    address: MOCK_EVM_ACCOUNT_2,
    assets: {
      fiatBalance: '$6400.00\n2 ETH',
      tokens: [],
    },
    type: KeyringTypes.hd,
    yOffset: 78,
    isSelected: false,
    balanceError: undefined,
    caipAccountId: MOCK_EVM_ACCOUNT_2_CAIP_ACCOUNT_ID,
    isLoadingAccount: false,
    scopes: [MOCK_EVM_CAIP_SCOPE_1],
  },
];

const MOCK_INTERNAL_ACCOUNTS: InternalAccount[] = [
  {
    type: 'eip155:eoa',
    id: 'mock-id-1',
    options: {},
    metadata: {
      name: MOCK_EVM_ACCOUNT_1_NAME,
      importTime: 1700000000,
      keyring: { type: KeyringTypes.hd },
    },
    address: MOCK_EVM_ACCOUNT_1,
    scopes: [MOCK_EVM_CAIP_SCOPE_1],
    methods: [
      'personal_sign',
      'eth_sign',
      'eth_signTransaction',
      'eth_signTypedData_v1',
      'eth_signTypedData_v3',
      'eth_signTypedData_v4',
    ],
  },
  {
    type: 'eip155:eoa',
    id: 'mock-id-2',
    options: {},
    metadata: {
      name: MOCK_EVM_ACCOUNT_2_NAME,
      importTime: 1700000001,
      keyring: { type: KeyringTypes.hd },
    },
    address: MOCK_EVM_ACCOUNT_2,
    scopes: [MOCK_EVM_CAIP_SCOPE_1],
    methods: [
      'personal_sign',
      'eth_sign',
      'eth_signTransaction',
      'eth_signTypedData_v1',
      'eth_signTypedData_v3',
      'eth_signTypedData_v4',
    ],
  },
];

const mockedNavigate = jest.fn();
const mockedGoBack = jest.fn();
const mockedTrackEvent = jest.fn();

jest.mock('@tommasini/react-native-scrollable-tab-view', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DefaultTabBar: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    MultichainNetworkController: {
      setActiveNetwork: jest.fn(),
    },
    SelectedNetworkController: {
      setNetworkClientIdForDomain: jest.fn(),
    },
    PermissionController: {
      revokeAllPermissions: jest.fn(),
    },
    KeyringController: {
      state: {
        keyrings: [
          {
            type: 'HD Key Tree',
            accounts: ['0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272'],
            metadata: {
              id: 'mock-keyring-id',
            },
          },
        ],
      },
      getAccountKeyringType: jest.fn(() => 'HD Key Tree'),
    },
    AccountsController: {
      listAccounts: jest.fn(() => []),
      listMultichainAccounts: jest.fn(() => []),
      getAccountByAddress: jest.fn(() => null),
      getNextAvailableAccountName: jest.fn(() => 'Account 3'),
      state: {
        internalAccounts: {
          accounts: {
            'mock-id-1': {
              type: 'eip155:eoa',
              id: 'mock-id-1',
              metadata: {
                name: 'Account 1',
                keyring: { type: 'HD Key Tree' },
              },
              address: '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272',
            },
            'mock-id-2': {
              type: 'eip155:eoa',
              id: 'mock-id-2',
              metadata: {
                name: 'Account 2',
                keyring: { type: 'HD Key Tree' },
              },
              address: '0xd018538C87232FF95acbCe4870629b75640a78E7',
            },
          },
          selectedAccount: 'mock-id-1',
        },
      },
    },
    AccountTrackerController: {
      state: {
        accounts: {
          '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272': {},
          '0xd018538C87232FF95acbCe4870629b75640a78E7': {},
        },
      },
    },
  },
}));

jest.mock('../../../core/Permissions', () => ({
  ...jest.requireActual('../../../core/Permissions'),
  updatePermittedChains: jest.fn(),
  addPermittedAccounts: jest.fn(),
  removePermittedAccounts: jest.fn(),
  sortMultichainAccountsByLastSelected: jest.fn((accounts) => accounts),
}));
const mockUpdatePermittedChains = updatePermittedChains as jest.Mock;
const mockAddPermittedAccounts = addPermittedAccounts as jest.Mock;
const mockRemovePermittedAccounts = removePermittedAccounts as jest.Mock;

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockedNavigate,
      goBack: mockedGoBack,
    }),
  };
});

jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockedTrackEvent,
  }),
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

jest.mock('../../hooks/useAccounts', () => {
  const useAccountsMock = jest.fn(() => ({
    evmAccounts: MOCK_USE_ACCOUNTS_RETURN,
    accounts: MOCK_USE_ACCOUNTS_RETURN,
    ensByAccountAddress: {},
  }));
  return {
    useAccounts: useAccountsMock,
    Account: Object, // Mock for the Account type
  };
});

const mockInitialState = (
  accounts: Hex[] = ['0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272'],
): DeepPartial<RootState> => ({
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      MultichainNetworkController: {
        multichainNetworkConfigurationsByChainId: {},
        networksWithTransactionActivity: {
          [MOCK_EVM_ACCOUNT_1.toLowerCase()]: {
            namespace: 'eip155:0',
            activeChains: ['1', '56'],
          },
          [MOCK_EVM_ACCOUNT_2.toLowerCase()]: {
            namespace: 'eip155:0',
            activeChains: ['1', '137'],
          },
        },
      },
      KeyringController: {
        isUnlocked: true,
        keyringTypes: {},
        keyrings: [
          {
            type: 'HD Key Tree',
            accounts,
            metadata: {
              id: 'mock-keyring-id',
            },
          },
        ],
      },
      AccountsController: {
        internalAccounts: {
          accounts: accounts.reduce(
            (acc, account, index) => {
              const mockAccount = MOCK_INTERNAL_ACCOUNTS[index];
              if (mockAccount) {
                acc[mockAccount.id] = {
                  ...mockAccount,
                  address: account,
                };
              }
              return acc;
            },
            {} as Record<string, InternalAccount>,
          ),
          selectedAccount: 'mock-id-1',
        },
      },
      PermissionController: {
        subjects: {
          test: {
            permissions: {
              [Caip25EndowmentPermissionName]: {
                caveats: [
                  {
                    type: Caip25CaveatType,
                    value: {
                      requiredScopes: {},
                      optionalScopes: {
                        'eip155:1': {
                          accounts: accounts.map(
                            (account) => `eip155:1:${account}`,
                          ),
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  },
});

describe('AccountPermissions', () => {
  beforeEach(() => {
    mockUpdatePermittedChains.mockReset();
    mockAddPermittedAccounts.mockReset();
    mockRemovePermittedAccounts.mockReset();
  });

  it('renders correctly', () => {
    const { toJSON } = renderWithProvider(
      <AccountPermissions
        route={{
          params: {
            hostInfo: { metadata: { origin: 'test' } },
          },
        }}
      />,
      { state: mockInitialState() },
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('should handle manage permissions button press and navigate to permissions summary', () => {
    const { getByTestId } = renderWithProvider(
      <AccountPermissions
        route={{
          params: {
            hostInfo: { metadata: { origin: 'test' } },
          },
        }}
      />,
      { state: mockInitialState() },
    );

    const managePermissionsButton = getByTestId(
      ConnectedAccountsSelectorsIDs.MANAGE_PERMISSIONS,
    );
    fireEvent.press(managePermissionsButton);

    expect(getByTestId('permission-summary-container')).toBeDefined();
  });

  it('should render connect more accounts screen when specified as initial screen', () => {
    const { getByText } = renderWithProvider(
      <AccountPermissions
        route={{
          params: {
            hostInfo: { metadata: { origin: 'test' } },
            initialScreen: AccountPermissionsScreens.ConnectMoreAccounts,
          },
        }}
      />,
      { state: mockInitialState() },
    );

    expect(getByText('Connect more accounts')).toBeDefined();
  });

  it('handles update permissions when networks are selected', async () => {
    const { getByText, getByTestId } = renderWithProvider(
      <AccountPermissions
        route={{
          params: {
            hostInfo: { metadata: { origin: 'test' } },
            initialScreen: AccountPermissionsScreens.ConnectMoreNetworks,
          },
        }}
      />,
      { state: mockInitialState() },
    );

    // Select a network
    const network = getByText('Sepolia');
    fireEvent.press(network);

    // Press update button
    const updateButton = getByTestId(
      NetworkConnectMultiSelectorSelectorsIDs.UPDATE_CHAIN_PERMISSIONS,
    );
    fireEvent.press(updateButton);

    expect(mockUpdatePermittedChains).toHaveBeenCalledWith(
      'test',
      ['eip155:1', 'eip155:11155111'],
      true,
    );
  });

  it('handles switches the active network when active network is no longer selected', async () => {
    const { getByText, getByTestId } = renderWithProvider(
      <AccountPermissions
        route={{
          params: {
            hostInfo: { metadata: { origin: 'test' } },
            initialScreen: AccountPermissionsScreens.ConnectMoreNetworks,
          },
        }}
      />,
      { state: mockInitialState() },
    );

    // Unselect existing network
    const existingNetwork = getByText(MAINNET_DISPLAY_NAME);
    fireEvent.press(existingNetwork);

    // Select a network
    const network = getByText('Sepolia');
    fireEvent.press(network);

    // Press update button
    const updateButton = getByTestId(
      NetworkConnectMultiSelectorSelectorsIDs.UPDATE_CHAIN_PERMISSIONS,
    );
    await act(() => {
      fireEvent.press(updateButton);
    });

    expect(
      Engine.context.SelectedNetworkController.setNetworkClientIdForDomain,
    ).toHaveBeenCalled();
    expect(mockUpdatePermittedChains).toHaveBeenCalledWith(
      'test',
      ['eip155:11155111'],
      true,
    );
  });

  it('handles the revoke permissions modal when no networks are selected', async () => {
    const { getByText, getByTestId } = renderWithProvider(
      <AccountPermissions
        route={{
          params: {
            hostInfo: { metadata: { origin: 'test' } },
            initialScreen: AccountPermissionsScreens.ConnectMoreNetworks,
          },
        }}
      />,
      { state: mockInitialState() },
    );

    // Unselect existing permitted chain
    const network = getByText(MAINNET_DISPLAY_NAME);
    fireEvent.press(network);

    // Press revoke button
    const revokeButton = getByTestId(
      ConnectedAccountsSelectorsIDs.DISCONNECT_NETWORKS_BUTTON,
    );
    fireEvent.press(revokeButton);

    expect(mockedNavigate).toHaveBeenCalled();
  });

  it('handles update permissions when accounts are selected from connect more view', async () => {
    const { getByText, getByTestId } = renderWithProvider(
      <AccountPermissions
        route={{
          params: {
            hostInfo: { metadata: { origin: 'test' } },
            initialScreen: AccountPermissionsScreens.ConnectMoreAccounts,
          },
        }}
      />,
      { state: mockInitialState() },
    );

    // Select a new account
    const newAccount = getByText('Account 2');
    fireEvent.press(newAccount);

    // Press update button
    const updateButton = getByTestId(
      ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON,
    );
    fireEvent.press(updateButton);

    expect(mockAddPermittedAccounts).toHaveBeenCalledWith('test', [
      'eip155:0:0xd018538C87232FF95acbCe4870629b75640a78E7',
    ]);
  });

  it('handles update permissions when accounts are added from edit view', async () => {
    const { getByText, getByTestId } = renderWithProvider(
      <AccountPermissions
        route={{
          params: {
            hostInfo: { metadata: { origin: 'test' } },
            initialScreen: AccountPermissionsScreens.EditAccountsPermissions,
          },
        }}
      />,
      { state: mockInitialState() },
    );

    // Select a new account
    const newAccount = getByText('Account 2');
    fireEvent.press(newAccount);

    // Press update button
    const updateButton = getByTestId(
      ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON,
    );
    fireEvent.press(updateButton);

    expect(mockAddPermittedAccounts).toHaveBeenCalledWith('test', [
      'eip155:0:0xd018538C87232FF95acbCe4870629b75640a78E7',
    ]);
    expect(mockRemovePermittedAccounts).not.toHaveBeenCalled();
  });

  it('handles update permissions when accounts are removed from edit view', async () => {
    const { getByText, getByTestId } = renderWithProvider(
      <AccountPermissions
        route={{
          params: {
            hostInfo: { metadata: { origin: 'test' } },
            initialScreen: AccountPermissionsScreens.EditAccountsPermissions,
          },
        }}
      />,
      {
        state: mockInitialState([MOCK_EVM_ACCOUNT_1, MOCK_EVM_ACCOUNT_2]),
      },
    );

    // Unselect exsting permitted account
    const existingAccount = getByText('Account 1');
    fireEvent.press(existingAccount);

    // Press update button
    const updateButton = getByTestId(
      ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON,
    );
    fireEvent.press(updateButton);

    expect(mockAddPermittedAccounts).not.toHaveBeenCalled();
    expect(mockRemovePermittedAccounts).toHaveBeenCalledWith('test', [
      '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272',
    ]);
  });

  it('handles update permissions when accounts are added and removed from edit view', async () => {
    const { getByText, getByTestId } = renderWithProvider(
      <AccountPermissions
        route={{
          params: {
            hostInfo: { metadata: { origin: 'test' } },
            initialScreen: AccountPermissionsScreens.EditAccountsPermissions,
          },
        }}
      />,
      { state: mockInitialState() },
    );

    // Unselect exsting permitted account
    const existingAccount = getByText('Account 1');
    fireEvent.press(existingAccount);

    // Select a new account
    const newAccount = getByText('Account 2');
    fireEvent.press(newAccount);

    // Press update button
    const updateButton = getByTestId(
      ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON,
    );
    fireEvent.press(updateButton);

    expect(mockAddPermittedAccounts).toHaveBeenCalledWith('test', [
      'eip155:0:0xd018538C87232FF95acbCe4870629b75640a78E7',
    ]);
    expect(mockRemovePermittedAccounts).toHaveBeenCalledWith('test', [
      '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272',
    ]);
  });

  it('handles the revoke permissions modal when no accounts are selected', async () => {
    const { getByText, getByTestId } = renderWithProvider(
      <AccountPermissions
        route={{
          params: {
            hostInfo: { metadata: { origin: 'test' } },
            initialScreen: AccountPermissionsScreens.EditAccountsPermissions,
          },
        }}
      />,
      { state: mockInitialState() },
    );

    // Unselect existing permitted account
    const account = getByText('Account 1');
    fireEvent.press(account);

    // Press revoke button
    const revokeButton = getByTestId(
      ConnectedAccountsSelectorsIDs.DISCONNECT_NETWORKS_BUTTON,
    );
    fireEvent.press(revokeButton);

    expect(mockedNavigate).toHaveBeenCalled();
  });

  it('should render AddAccount screen with multichain options', () => {
    const renderResult = renderWithProvider(
      <AccountPermissions
        route={{
          params: {
            hostInfo: { metadata: { origin: 'test' } },
            initialScreen: AccountPermissionsScreens.AddAccount,
          },
        }}
      />,
      { state: mockInitialState() },
    );

    expect(renderResult).toBeDefined();
  });

  it('handles account creation completion and navigates back to connected screen', () => {
    const { getByText } = renderWithProvider(
      <AccountPermissions
        route={{
          params: {
            hostInfo: { metadata: { origin: 'test' } },
            initialScreen: AccountPermissionsScreens.ConnectMoreAccounts,
          },
        }}
      />,
      { state: mockInitialState() },
    );

    expect(getByText('Connect more accounts')).toBeDefined();
    expect(mockAddPermittedAccounts).not.toHaveBeenCalled();
  });

  it('handles multichain account creation with specific client type and scope', async () => {
    const { getByText } = renderWithProvider(
      <AccountPermissions
        route={{
          params: {
            hostInfo: { metadata: { origin: 'test' } },
            initialScreen: AccountPermissionsScreens.EditAccountsPermissions,
          },
        }}
      />,
      { state: mockInitialState() },
    );

    expect(getByText('Account 1')).toBeDefined();
    expect(getByText('Account 2')).toBeDefined();
  });
});
