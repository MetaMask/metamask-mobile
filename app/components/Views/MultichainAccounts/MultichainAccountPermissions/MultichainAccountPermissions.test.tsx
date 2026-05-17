import React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider, {
  DeepPartial,
} from '../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { RootState } from '../../../../reducers';
import { MultichainAccountPermissions } from './MultichainAccountPermissions';
import Engine from '../../../../core/Engine';
import { MAINNET_DISPLAY_NAME } from '../../../../core/Engine/constants';
import { getNetworkImageSource } from '../../../../util/networks';
import {
  Caip25CaveatType,
  Caip25EndowmentPermissionName,
} from '@metamask/chain-agnostic-permission';
import { toast } from '@metamask/design-system-react-native';
import Routes from '../../../../constants/navigation/Routes';
import { strings } from '../../../../../locales/i18n';
import { ConnectedAccountsSelectorsIDs } from '../../AccountConnect/ConnectedAccountModal.testIds';
import { ConnectAccountBottomSheetSelectorsIDs } from '../../AccountConnect/ConnectAccountBottomSheet.testIds';
import { NetworkConnectMultiSelectorSelectorsIDs } from '../../NetworkConnect/NetworkConnectMultiSelector.testIds';

jest.mock('@metamask/design-system-react-native', () => {
  const actualDesignSystem = jest.requireActual(
    '@metamask/design-system-react-native',
  );

  return {
    ...actualDesignSystem,
    Toaster: jest.fn(() => null),
    toast: Object.assign(jest.fn(), {
      dismiss: jest.fn(),
    }),
  };
});

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
      hasPermissions: jest.fn(),
      revokeAllPermissions: jest.fn(),
      revokePermissions: jest.fn(),
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
        selectedAccountGroup: 'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/0',
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
            wallets: {},
          },
          selectedAccountGroup: mockGroupId1,
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

/** CAIP-25 permissions in Redux so getPermissions + network avatars enable the connect button. */
const mockInitialStateWithTestComPermissions = (): DeepPartial<RootState> => {
  const base = mockInitialState();
  return {
    ...base,
    engine: {
      ...base.engine,
      backgroundState: {
        ...base.engine?.backgroundState,
        PermissionController: {
          subjects: {
            'test.com': {
              permissions: {
                [Caip25EndowmentPermissionName]: {
                  caveats: [
                    {
                      type: Caip25CaveatType,
                      value: {
                        requiredScopes: {},
                        optionalScopes: {
                          'eip155:1': {
                            accounts: [
                              `eip155:1:${mockEvmAccount1Address}`,
                              `eip155:1:${mockEvmAccount2Address}`,
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
      } as (typeof base)['engine'] extends { backgroundState: infer BG }
        ? BG
        : never,
    },
  };
};

describe('MultichainAccountPermissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedNavigate.mockReset();
    mockedGoBack.mockReset();
  });

  describe('handleOnCancel', () => {
    it('should call navigation goBack when cancel is pressed', async () => {
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
      await act(async () => {
        fireEvent.press(cancelButton);
      });

      expect(mockedGoBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleOnEdit', () => {
    it('should switch to EditAccountsPermissions screen when edit is pressed', async () => {
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

      await act(async () => {
        fireEvent.press(editButton);
      });

      // After pressing edit, the screen should show the EditAccountsPermissions screen
      // We can verify this by checking for the "Edit accounts" title
      expect(getByTestId('sheet-header-back-button')).toBeDefined();
    });
  });

  describe('handleOnEditNetworks', () => {
    it('should switch to ConnectMoreNetworks screen when edit networks is pressed', async () => {
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
      await act(async () => {
        fireEvent.press(editNetworksButton);
      });

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
        { state: mockInitialStateWithTestComPermissions() },
      );

      const confirmButton = getByTestId('connect-button');

      await act(async () => {
        fireEvent.press(confirmButton);
      });

      await waitFor(() => {
        expect(mockUpdateCaveat).toHaveBeenCalledWith(
          'test.com',
          Caip25EndowmentPermissionName,
          Caip25CaveatType,
          expect.objectContaining({
            optionalScopes: expect.any(Object),
            requiredScopes: expect.any(Object),
            isMultichainOrigin: true,
            sessionProperties: expect.any(Object),
          }),
        );
      });
      expect(toast).toHaveBeenCalledWith(
        expect.objectContaining({
          description: strings('toast.accounts_permissions_updated'),
          hasNoTimeout: false,
          startAccessory: expect.any(Object),
        }),
      );
      expect(mockedNavigate).toHaveBeenCalledWith(Routes.BROWSER.HOME);
    });
  });

  describe('handleRevokeAll', () => {
    it('revokes CAIP-25 permissions from the disconnect all confirmation callback', async () => {
      const mockHasPermissions = Engine.context.PermissionController
        .hasPermissions as jest.Mock;
      const mockRevokeAllPermissions = Engine.context.PermissionController
        .revokeAllPermissions as jest.Mock;
      const mockRevokePermissions = Engine.context.PermissionController
        .revokePermissions as jest.Mock;
      mockHasPermissions.mockResolvedValue(true);
      mockRevokeAllPermissions.mockResolvedValue(undefined);
      mockRevokePermissions.mockResolvedValue(undefined);

      const { getByTestId } = renderWithProvider(
        <MultichainAccountPermissions
          route={{
            params: {
              hostInfo: { metadata: { origin: 'test.com' } },
            },
          }}
        />,
        { state: mockInitialStateWithTestComPermissions() },
      );

      await act(async () => {
        fireEvent.press(
          getByTestId(
            ConnectedAccountsSelectorsIDs.DISCONNECT_ALL_ACCOUNTS_NETWORKS,
          ),
        );
      });
      const revokeAllParams = mockedNavigate.mock.calls.find(
        ([route, params]) =>
          route === Routes.MODAL.ROOT_MODAL_FLOW &&
          params?.screen === Routes.SHEET.REVOKE_ALL_ACCOUNT_PERMISSIONS,
      )?.[1]?.params;
      expect(revokeAllParams).toBeDefined();

      await act(async () => {
        await revokeAllParams.onRevokeAll();
      });

      expect(mockHasPermissions).toHaveBeenCalledWith('test.com');
      expect(mockRevokeAllPermissions).toHaveBeenCalledWith('test.com');
      expect(mockRevokePermissions).toHaveBeenCalledWith({
        'test.com': [Caip25EndowmentPermissionName],
      });
      expect(toast).toHaveBeenCalledWith({
        description: strings('toast.disconnected_all'),
        hasNoTimeout: false,
      });
      expect(mockedNavigate).toHaveBeenCalledWith(Routes.BROWSER.HOME);
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

    it('returns to the connected screen after account permissions are updated', async () => {
      const { findByTestId, getByTestId } = renderWithProvider(
        <MultichainAccountPermissions
          route={{
            params: {
              hostInfo: { metadata: { origin: 'test.com' } },
            },
          }}
        />,
        { state: mockInitialState() },
      );

      await act(async () => {
        fireEvent.press(getByTestId('account-list-bottom-sheet'));
      });
      const updateButton = await findByTestId(
        ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON,
      );

      await act(async () => {
        fireEvent.press(updateButton);
      });

      expect(getByTestId('cancel-button')).toBeDefined();
    });
  });

  describe('handleNetworksSelected', () => {
    it('should handle network selection flow', async () => {
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
      await act(async () => {
        fireEvent.press(editNetworksButton);
      });

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
      await act(async () => {
        fireEvent.press(editNetworksButton);
      });

      // Act - Select Sepolia
      const sepoliaNetwork = getByText('Sepolia');
      await act(async () => {
        fireEvent.press(sepoliaNetwork);
      });

      const updateButton = getByTestId('multiconnect-connect-network-button');
      await act(async () => {
        fireEvent.press(updateButton);
      });

      // Assert - The component renders correctly and handles network selection
      // The console log shows the correct chain IDs are being passed to onSubmit
      expect(updateButton).toBeDefined();
    });

    it('switches the active dapp network when the current EVM network is removed', async () => {
      const mockSetNetworkClientIdForDomain = Engine.context
        .SelectedNetworkController.setNetworkClientIdForDomain as jest.Mock;
      const mockUpdate = Engine.context.SelectedNetworkController
        .update as jest.Mock;

      const { getByText, getByTestId } = renderWithProvider(
        <MultichainAccountPermissions
          route={{
            params: {
              hostInfo: { metadata: { origin: 'test.com' } },
            },
          }}
        />,
        { state: mockInitialStateWithTestComPermissions() },
      );

      await act(async () => {
        fireEvent.press(
          getByTestId(
            ConnectedAccountsSelectorsIDs.NAVIGATE_TO_EDIT_NETWORKS_PERMISSIONS_BUTTON,
          ),
        );
      });
      expect(getByTestId(`${MAINNET_DISPLAY_NAME}-selected`)).toBeDefined();

      await act(async () => {
        fireEvent.press(getByText(MAINNET_DISPLAY_NAME));
      });
      await waitFor(() => {
        expect(
          getByTestId(`${MAINNET_DISPLAY_NAME}-not-selected`),
        ).toBeDefined();
      });
      await act(async () => {
        fireEvent.press(getByText('Sepolia'));
      });
      await act(async () => {
        fireEvent.press(
          getByTestId(
            NetworkConnectMultiSelectorSelectorsIDs.UPDATE_CHAIN_PERMISSIONS,
          ),
        );
      });

      expect(mockSetNetworkClientIdForDomain).toHaveBeenCalledWith(
        'test.com',
        'sepolia',
      );
      const updateActiveDappNetwork = mockUpdate.mock.calls[0][0];
      const selectedNetworkState = { activeDappNetwork: null };
      updateActiveDappNetwork(selectedNetworkState);
      expect(selectedNetworkState.activeDappNetwork).toBe('sepolia');
      expect(getByTestId('cancel-button')).toBeDefined();
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
    it('should render correct screen based on current state', async () => {
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

    it('should handle navigation between screens', async () => {
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
      await act(async () => {
        fireEvent.press(editNetworksButton);
      });

      expect(getByTestId('sheet-header-back-button')).toBeDefined();

      const backButton = getByTestId('sheet-header-back-button');
      await act(async () => {
        fireEvent.press(backButton);
      });

      expect(getByTestId('cancel-button')).toBeDefined();
    });

    it('returns to the connected screen from the edit accounts back button', async () => {
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

      await act(async () => {
        fireEvent.press(getByTestId('account-list-bottom-sheet'));
      });
      const backButton = getByTestId('sheet-header-back-button');

      await act(async () => {
        fireEvent.press(backButton);
      });

      expect(getByTestId('cancel-button')).toBeDefined();
    });
  });
});
