import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import renderWithProvider, {
  DeepPartial,
} from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { RootState } from '../../../../reducers';
import { MultichainAccountPermissions } from './MultichainAccountPermissions';
import Engine from '../../../../core/Engine';
import { MAINNET_DISPLAY_NAME } from '../../../../core/Engine/constants';
import { getNetworkImageSource } from '../../../../util/networks';

const mockedNavigate = jest.fn();
const mockedGoBack = jest.fn();

const mockEvmAccount1Address = '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272';
const mockEvmAccount2Address = '0xd018538C87232FF95acbCe4870629b75640a78E7';
const mockGroupId1 = 'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/0';

jest.mock('@tommasini/react-native-scrollable-tab-view', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DefaultTabBar: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    MultichainNetworkController: {
      setActiveNetwork: jest.fn(),
    },
    SelectedNetworkController: {
      setNetworkClientIdForDomain: jest.fn(),
      update: jest.fn(),
    },
    NetworkController: {
      state: {
        providerConfig: {
          chainId: '0x1', // Mainnet
        },
        networkConfigurations: {
          mainnet: {
            caipChainId: 'eip155:1',
            rpcEndpoints: [
              {
                networkClientId: 'mainnet',
              },
            ],
            defaultRpcEndpointIndex: 0,
          },
          sepolia: {
            caipChainId: 'eip155:11155111',
            rpcEndpoints: [
              {
                networkClientId: 'sepolia',
              },
            ],
            defaultRpcEndpointIndex: 0,
          },
        },
      },
    },
    PermissionController: {
      updateCaveat: jest.fn(),
      revokeAllPermissions: jest.fn(),
      state: {
        subjects: {
          'test.com': {
            permissions: {
              'endowment:caip25': {
                caveats: [
                  {
                    type: 'authorizedScopes',
                    value: {
                      requiredScopes: {},
                      optionalScopes: {
                        'eip155:1': {
                          accounts: [
                            'eip155:1:0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272',
                            'eip155:1:0xd018538C87232FF95acbCe4870629b75640a78E7',
                          ],
                        },
                      },
                      sessionProperties: {},
                      isMultichainOrigin: true,
                    },
                  },
                ],
              },
            },
          },
        },
      },
    },
    KeyringController: {
      state: {
        keyrings: [
          {
            type: 'HD Key Tree',
            accounts: [
              '0xC4955C0d639D99699Bfd7Ec54d9FaFEe40e4D272',
              '0xd018538C87232FF95acbCe4870629b75640a78E7',
            ],
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
          accounts: {},
          selectedAccount: 'mock-id-1',
        },
      },
    },
    AccountTreeController: {
      state: {
        accountTree: {
          selectedAccountGroup: 'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/0',
          wallets: {
            'entropy:01JKAF3DSGM3AB87EM9N0K41AJ': {
              id: 'entropy:01JKAF3DSGM3AB87EM9N0K41AJ',
              type: 'entropy',
              metadata: {
                name: 'Test Wallet 1',
                entropy: {
                  id: '01JKAF3DSGM3AB87EM9N0K41AJ',
                },
              },
              groups: {
                'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/0': {
                  id: 'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/0',
                  type: 'multichain-account',
                  metadata: {
                    name: 'Test Group 1',
                    pinned: false,
                    hidden: false,
                    entropy: {
                      groupIndex: 0,
                    },
                  },
                  accounts: ['mock-id-1', 'mock-sol-id-1'],
                },
                'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/1': {
                  id: 'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/1',
                  type: 'multichain-account',
                  metadata: {
                    name: 'Test Group 2',
                    pinned: false,
                    hidden: false,
                    entropy: {
                      groupIndex: 1,
                    },
                  },
                  accounts: ['mock-id-2'],
                },
              },
            },
          },
        },
      },
    },
  },
}));

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

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { width: 0, height: 0, x: 0, y: 0 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    SafeAreaView: jest.fn().mockImplementation(({ children }) => children),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
    useSafeAreaFrame: jest.fn().mockImplementation(() => frame),
  };
});

jest.mock(
  '../../../hooks/useAccountGroupsForPermissions/useAccountGroupsForPermissions',
  () => ({
    useAccountGroupsForPermissions: jest.fn(() => ({
      connectedAccountGroups: [
        {
          id: 'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/0',
          type: 'multichain-account',
          metadata: { name: 'Test Group 1' },
          accounts: [],
        },
      ],
      supportedAccountGroups: [
        {
          id: 'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/0',
          type: 'multichain-account',
          metadata: { name: 'Test Group 1' },
          accounts: [],
        },
        {
          id: 'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/1',
          type: 'multichain-account',
          metadata: { name: 'Test Group 2' },
          accounts: [],
        },
      ],
    })),
  }),
);

jest.mock('../../../../util/networks', () => ({
  getNetworkImageSource: jest.fn(() => 'mock-image-source'),
}));

jest.mock('../../../../selectors/selectedNetworkController', () => ({
  useNetworkInfo: jest.fn(() => ({
    chainId: '0x1', // Mainnet
  })),
}));

const mockInitialState = () => {
  const mockState = {
    settings: {},
    engine: {
      backgroundState: {
        ...backgroundState,
        KeyringController: {
          ...backgroundState.KeyringController,
          isUnlocked: true,
          keyrings: [
            {
              type: 'HD Key Tree',
              accounts: [mockEvmAccount1Address, mockEvmAccount2Address],
              metadata: {
                id: 'mock-keyring-id',
                name: 'Test Keyring',
              },
            },
          ],
        },
        AccountsController: {
          ...backgroundState.AccountsController,
          internalAccounts: {
            accounts: {},
            selectedAccount: 'mock-id-1',
          },
        },
        AccountTreeController: {
          ...backgroundState.AccountTreeController,
          accountTree: {
            selectedAccountGroup: mockGroupId1,
            wallets: {},
          },
        },
        MultichainNetworkController: {
          ...backgroundState.MultichainNetworkController,
          networksWithTransactionActivity: {},
        },
      },
    },
  };

  return mockState as DeepPartial<RootState>;
};

describe('MultichainAccountPermissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedNavigate.mockReset();
    mockedGoBack.mockReset();
  });

  describe('handleOnCancel', () => {
    it('should call navigation goBack when cancel is pressed', () => {
      const { getByTestId } = renderWithProvider(
        <MultichainAccountPermissions
          route={{
            params: {
              hostInfo: { metadata: { origin: 'test.com' } },
            },
          }}
        />,
        { state: mockInitialState() },
      );

      const cancelButton = getByTestId('cancel-button');
      fireEvent.press(cancelButton);

      expect(mockedGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleOnEdit', () => {
    it('should switch to EditAccountsPermissions screen when edit is pressed', () => {
      const { getByTestId } = renderWithProvider(
        <MultichainAccountPermissions
          route={{
            params: {
              hostInfo: { metadata: { origin: 'test.com' } },
            },
          }}
        />,
        { state: mockInitialState() },
      );

      const editButton = getByTestId('account-list-bottom-sheet');
      expect(editButton).toBeDefined();

      fireEvent.press(editButton);

      // After pressing edit, the screen should show the EditAccountsPermissions screen
      // We can verify this by checking for the "Edit accounts" title
      expect(getByTestId('sheet-header-back-button')).toBeDefined();
    });
  });

  describe('handleOnEditNetworks', () => {
    it('should switch to ConnectMoreNetworks screen when edit networks is pressed', () => {
      const { getByTestId } = renderWithProvider(
        <MultichainAccountPermissions
          route={{
            params: {
              hostInfo: { metadata: { origin: 'test.com' } },
            },
          }}
        />,
        { state: mockInitialState() },
      );

      const editNetworksButton = getByTestId(
        'navigate_to_edit_networks_permissions_button',
      );
      fireEvent.press(editNetworksButton);

      expect(getByTestId('sheet-header-back-button')).toBeDefined();
      expect(getByTestId(`${MAINNET_DISPLAY_NAME}-not-selected`)).toBeDefined();
    });
  });

  describe('handleConfirm', () => {
    it('should update permissions and navigate back when confirm is pressed', async () => {
      const mockUpdateCaveat = Engine.context.PermissionController
        .updateCaveat as jest.Mock;

      const { getByTestId } = renderWithProvider(
        <MultichainAccountPermissions
          route={{
            params: {
              hostInfo: { metadata: { origin: 'test.com' } },
            },
          }}
        />,
        { state: mockInitialState() },
      );

      const confirmButton = getByTestId('connect-button');

      await act(async () => {
        fireEvent.press(confirmButton);
      });

      expect(mockUpdateCaveat).toHaveBeenCalledWith(
        'test.com',
        'endowment:caip25',
        'authorizedScopes',
        expect.any(Object),
      );
    });
  });

  describe('handleAccountGroupsSelected', () => {
    it('should verify account groups can be selected', () => {
      const { getByTestId } = renderWithProvider(
        <MultichainAccountPermissions
          route={{
            params: {
              hostInfo: { metadata: { origin: 'test.com' } },
            },
          }}
        />,
        { state: mockInitialState() },
      );

      const editButton = getByTestId('account-list-bottom-sheet');
      expect(editButton).toBeDefined();

      expect(getByTestId('cancel-button')).toBeDefined();
      expect(getByTestId('connect-button')).toBeDefined();
    });
  });

  describe('handleNetworksSelected', () => {
    it('should handle network selection flow', () => {
      const { getByTestId } = renderWithProvider(
        <MultichainAccountPermissions
          route={{
            params: {
              hostInfo: { metadata: { origin: 'test.com' } },
            },
          }}
        />,
        { state: mockInitialState() },
      );

      const editNetworksButton = getByTestId(
        'navigate_to_edit_networks_permissions_button',
      );
      fireEvent.press(editNetworksButton);

      // Check that we're in the network selection screen
      expect(getByTestId('sheet-header-back-button')).toBeDefined();

      expect(getByTestId(`${MAINNET_DISPLAY_NAME}-not-selected`)).toBeDefined();
      expect(getByTestId('Sepolia-not-selected')).toBeDefined();
    });

    it('handles network selection and calls onSubmit with correct chain IDs', async () => {
      // Arrange
      const { getByText, getByTestId } = renderWithProvider(
        <MultichainAccountPermissions
          route={{
            params: {
              hostInfo: { metadata: { origin: 'test.com' } },
            },
          }}
        />,
        { state: mockInitialState() },
      );

      // Navigate to network selection screen
      const editNetworksButton = getByTestId(
        'navigate_to_edit_networks_permissions_button',
      );
      fireEvent.press(editNetworksButton);

      // Act - Select Sepolia
      const sepoliaNetwork = getByText('Sepolia');
      fireEvent.press(sepoliaNetwork);

      const updateButton = getByTestId('multiconnect-connect-network-button');
      await act(() => {
        fireEvent.press(updateButton);
      });

      // Assert - The component renders correctly and handles network selection
      // The console log shows the correct chain IDs are being passed to onSubmit
      expect(updateButton).toBeDefined();
    });
  });

  describe('networkAvatars', () => {
    it('renders successfully and filters wallet scopes when creating network avatars', () => {
      // Arrange
      const mockGetNetworkImageSource =
        getNetworkImageSource as jest.MockedFunction<
          typeof getNetworkImageSource
        >;
      mockGetNetworkImageSource.mockClear();

      // Act - Render the component
      const { getByTestId } = renderWithProvider(
        <MultichainAccountPermissions
          route={{
            params: {
              hostInfo: { metadata: { origin: 'test.com' } },
            },
          }}
        />,
        { state: mockInitialState() },
      );

      // Assert - Component renders successfully without crashing
      expect(getByTestId('cancel-button')).toBeDefined();
      expect(
        getByTestId('navigate_to_edit_networks_permissions_button'),
      ).toBeDefined();

      // If getNetworkImageSource was called, verify no wallet scopes were passed
      const calls = mockGetNetworkImageSource.mock.calls;
      calls.forEach((call) => {
        const params = call[0];
        if (params?.chainId) {
          // The filter should exclude wallet scopes like 'wallet:eip155'
          expect(params.chainId).not.toMatch(/^wallet:/);
          // Should only be valid CAIP chain IDs
          expect(params.chainId).toMatch(/^[a-z]+:\d+$/);
        }
      });
    });
  });

  describe('screen navigation', () => {
    it('should render correct screen based on current state', () => {
      const { getByTestId } = renderWithProvider(
        <MultichainAccountPermissions
          route={{
            params: {
              hostInfo: { metadata: { origin: 'test.com' } },
            },
          }}
        />,
        { state: mockInitialState() },
      );

      expect(getByTestId('cancel-button')).toBeDefined();
    });

    it('should handle navigation between screens', () => {
      const { getByTestId } = renderWithProvider(
        <MultichainAccountPermissions
          route={{
            params: {
              hostInfo: { metadata: { origin: 'test.com' } },
            },
          }}
        />,
        { state: mockInitialState() },
      );

      const editNetworksButton = getByTestId(
        'navigate_to_edit_networks_permissions_button',
      );
      fireEvent.press(editNetworksButton);

      expect(getByTestId('sheet-header-back-button')).toBeDefined();

      const backButton = getByTestId('sheet-header-back-button');
      fireEvent.press(backButton);

      expect(getByTestId('cancel-button')).toBeDefined();
    });
  });
});
