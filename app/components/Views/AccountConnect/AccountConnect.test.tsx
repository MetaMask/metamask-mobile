import React from 'react';
import renderWithProvider, {
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import AccountConnect from './AccountConnect';
import { backgroundState } from '../../../util/test/initial-root-state';
import { RootState } from '../../../reducers';
import { fireEvent, waitFor } from '@testing-library/react-native';
import AccountConnectMultiSelector from './AccountConnectMultiSelector/AccountConnectMultiSelector';
import Engine from '../../../core/Engine';
import {
  createMockAccountsControllerState as createMockAccountsControllerStateUtil,
  MOCK_ADDRESS_1 as mockAddress1,
  MOCK_ADDRESS_2 as mockAddress2,
} from '../../../util/test/accountsControllerTestUtils';
import {
  Caip25CaveatType,
  Caip25EndowmentPermissionName,
  Caip25CaveatValue,
} from '@metamask/chain-agnostic-permission';
import { PermissionSummaryBottomSheetSelectorsIDs } from '../../../../e2e/selectors/Browser/PermissionSummaryBottomSheet.selectors';
import { AccountConnectSelectorsIDs } from '../../../../e2e/selectors/wallet/AccountConnect.selectors';
import { AddNewAccountIds } from '../../../../e2e/selectors/MultiSRP/AddHdAccount.selectors';
import { KeyringTypes } from '@metamask/keyring-controller';
import { SolScope } from '@metamask/keyring-api';
import { PermissionDoesNotExistError } from '@metamask/permission-controller';
import { ConnectedAccountsSelectorsIDs } from '../../../../e2e/selectors/Browser/ConnectedAccountModal.selectors';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerStateUtil([
  mockAddress1,
  mockAddress2,
]);
const mockKeyringId = '01JNG71B7GTWH0J1TSJY9891S0';

// Helper function to create properly typed CAIP-25 permissions
const createMockCaip25Permission = (
  optionalScopes: Record<string, { accounts: string[] }>,
) => ({
  [Caip25EndowmentPermissionName]: {
    parentCapability: Caip25EndowmentPermissionName,
    caveats: [
      {
        type: Caip25CaveatType,
        value: {
          requiredScopes: {},
          optionalScopes,
          isMultichainOrigin: false,
          sessionProperties: {},
        },
      },
    ] as [{ type: string; value: Caip25CaveatValue }],
  },
});

const mockedNavigate = jest.fn();
const mockedGoBack = jest.fn();
const mockedTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn().mockReturnValue({
  addProperties: jest.fn().mockReturnValue({
    build: jest.fn(),
  }),
});
const mockGetNextAvailableAccountName = jest
  .fn()
  .mockReturnValue('Snap Account 1');

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

jest.mock('react-native-scrollable-tab-view', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DefaultTabBar: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock('../../../components/hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockedTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
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

jest.mock('../../../core/Engine', () => {
  const {
    createMockAccountsControllerState,
    MOCK_ADDRESS_1,
    MOCK_ADDRESS_2,
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  } = require('../../../util/test/accountsControllerTestUtils');
  const mockAccountsState = createMockAccountsControllerState(
    [MOCK_ADDRESS_1, MOCK_ADDRESS_2],
    MOCK_ADDRESS_1,
  );
  // Ignore no shadowing warning for mocks.
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const { KeyringTypes } = jest.requireActual('@metamask/keyring-controller');

  return {
    context: {
      PhishingController: {
        maybeUpdateState: jest.fn(),
        test: jest.fn((url: string) => {
          if (url === 'phishing.com') return { result: true };
          return { result: false };
        }),
        scanUrl: jest.fn(async (url: string) => {
          if (url === 'https://phishing.com') {
            return { recommendedAction: 'BLOCK' };
          }
          return { recommendedAction: 'NONE' };
        }),
      },
      PermissionController: {
        rejectPermissionsRequest: jest.fn(),
        getCaveat: jest.fn(),
        acceptPermissionsRequest: jest.fn().mockResolvedValue(undefined),
        updateCaveat: jest.fn(),
        grantPermissionsIncremental: jest.fn(),
        hasCaveat: jest.fn().mockReturnValue(false),
      },
      AccountsController: {
        state: mockAccountsState,
        getAccountByAddress: jest.fn(),
        getNextAvailableAccountName: () => mockGetNextAvailableAccountName(),
      },
      KeyringController: {
        state: {
          keyrings: [
            {
              type: KeyringTypes.hd,
              accounts: [MOCK_ADDRESS_1, MOCK_ADDRESS_2],
              metadata: {
                id: '01JNG71B7GTWH0J1TSJY9891S0',
                name: '',
              },
            },
          ],
        },
      },
    },
  };
});

const mockRemoveChannel = jest.fn();
const mockGetConnection = jest.fn();

// Mock SDKConnect
jest.mock('../../../core/SDKConnect/SDKConnect', () => ({
  getInstance: () => ({
    getConnection: mockGetConnection,
    removeChannel: mockRemoveChannel,
  }),
}));

// Mock the isUUID function
jest.mock('../../../core/SDKConnect/utils/isUUID', () => ({
  isUUID: jest.fn(() => false),
}));

// Access the mocked function for test control
const { isUUID: mockIsUUID } = jest.requireMock(
  '../../../core/SDKConnect/utils/isUUID',
);

// Mock useAccounts to return test accounts
jest.mock('../../hooks/useAccounts', () => ({
  useAccounts: jest.fn(() => ({
    accounts: [
      {
        address: mockAddress1,
        name: 'Account 1',
        caipAccountId: `eip155:0:${mockAddress1}`,
      },
      {
        address: mockAddress2,
        name: 'Account 2',
        caipAccountId: `eip155:0:${mockAddress2}`,
      },
    ],
    ensByAccountAddress: {},
  })),
}));

// Mock AppConstants
jest.mock('../../../core/AppConstants', () => ({
  MM_SDK: {
    SDK_REMOTE_ORIGIN: 'metamask-sdk://connect?redirect=',
  },
  BUNDLE_IDS: {
    ANDROID: 'io.metamask',
  },
  MM_UNIVERSAL_LINK_HOST: 'metamask.app.link',
}));

// Setup test state with proper account data
const mockInitialState: DeepPartial<RootState> = {
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: createMockAccountsControllerStateUtil(
        [mockAddress2, mockAddress2],
        mockAddress1,
      ),
      NetworkController: {
        networkConfigurationsByChainId: {
          '0x1': {
            chainId: '0x1',
            name: 'Ethereum',
            rpcEndpoints: [{ url: 'https://mainnet.infura.io/v3/test' }],
            blockExplorerUrls: ['https://etherscan.io'],
            nativeCurrency: 'ETH',
          },
        },
        selectedNetworkClientId: '1',
      },
      KeyringController: {
        keyrings: [
          {
            type: KeyringTypes.hd,
            accounts: [mockAddress1, mockAddress2],
            metadata: {
              id: mockKeyringId,
              name: '',
            },
          },
        ],
      },
    },
  },
};

const mockCreateMultichainAccount = jest.fn().mockResolvedValue(null);
const mockMultichainWalletSnapClient = {
  createAccount: mockCreateMultichainAccount,
  getSnapId: jest.fn().mockReturnValue('mock-snap-id'),
  getSnapName: jest.fn().mockReturnValue('mock-snap-name'),
  getScopes: jest.fn().mockReturnValue([]),
  getSnapSender: jest.fn().mockReturnValue({}),
  withSnapKeyring: jest.fn().mockImplementation(async (callback) => {
    await callback({ createAccount: mockCreateMultichainAccount });
  }),
};

jest.mock('../../../core/SnapKeyring/MultichainWalletSnapClient', () => ({
  ...jest.requireActual('../../../core/SnapKeyring/MultichainWalletSnapClient'),
  WalletClientType: {
    Bitcoin: 'bitcoin',
    Solana: 'solana',
  },
  MultichainWalletSnapFactory: {
    createClient: jest
      .fn()
      .mockImplementation(() => mockMultichainWalletSnapClient),
  },
}));

// Set default mock behaviors
mockGetConnection.mockReturnValue(undefined);
mockIsUUID.mockReturnValue(false);

describe('AccountConnect', () => {
  beforeEach(() => jest.clearAllMocks());
  it('renders correctly with base request when there is no existing CAIP endowment', () => {
    (
      Engine.context.PermissionController.getCaveat as jest.Mock
    ).mockImplementation(() => {
      throw new PermissionDoesNotExistError(
        'Permission does not exist',
        Caip25EndowmentPermissionName,
      );
    });
    const { toJSON } = renderWithProvider(
      <AccountConnect
        route={{
          params: {
            hostInfo: {
              metadata: {
                id: 'mockId',
                origin: 'mockOrigin',
                isEip1193Request: true,
              },
              permissions: createMockCaip25Permission({
                'wallet:eip155': {
                  accounts: [],
                },
              }),
            },
            permissionRequestId: 'test',
          },
        }}
      />,
      { state: mockInitialState },
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly with request including chains and accounts', () => {
    const { toJSON } = renderWithProvider(
      <AccountConnect
        route={{
          params: {
            hostInfo: {
              metadata: {
                id: 'mockId',
                origin: 'mockOrigin',
              },
              permissions: createMockCaip25Permission({
                'eip155:1': {
                  accounts: [`eip155:1:${mockAddress1}`],
                },
              }),
            },
            permissionRequestId: 'test',
          },
        }}
      />,
      { state: mockInitialState },
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly with request including only chains', () => {
    const { toJSON } = renderWithProvider(
      <AccountConnect
        route={{
          params: {
            hostInfo: {
              metadata: {
                id: 'mockId',
                origin: 'mockOrigin',
              },
              permissions: createMockCaip25Permission({
                'eip155:1': {
                  accounts: [],
                },
              }),
            },
            permissionRequestId: 'test',
          },
        }}
      />,
      { state: mockInitialState },
    );

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly when merging existing CAIP-25 permissions', () => {
    const existingCaveat = {
      type: Caip25CaveatType,
      value: {
        requiredScopes: {},
        optionalScopes: {
          'eip155:1': { accounts: [`eip155:1:${mockAddress1}`] },
        },
        isMultichainOrigin: false,
        sessionProperties: {},
      },
    };

    (
      Engine.context.PermissionController.getCaveat as jest.Mock
    ).mockReturnValue(existingCaveat);

    const newPermissions = createMockCaip25Permission({
      'eip155:10': { accounts: [`eip155:10:${mockAddress2}`] },
    });

    const { toJSON } = renderWithProvider(
      <AccountConnect
        route={{
          params: {
            hostInfo: {
              metadata: {
                id: 'mockId',
                origin: 'mockOrigin',
              },
              permissions: newPermissions,
            },
            permissionRequestId: 'test',
          },
        }}
      />,
      { state: mockInitialState },
    );

    expect(toJSON()).toMatchSnapshot();
  });

  describe('AccountConnectMultiSelector handlers', () => {
    it('invokes onEditNetworks and renders multiconnect network selector', async () => {
      // Render the container component with necessary props
      const { getByTestId, findByTestId } = renderWithProvider(
        <AccountConnect
          route={{
            params: {
              hostInfo: {
                metadata: {
                  id: 'mockId',
                  // Using a valid URL format to ensure PermissionsSummary renders first
                  origin: 'https://example.com',
                },
                permissions: createMockCaip25Permission({
                  'wallet:eip155': {
                    accounts: [],
                  },
                }),
              },
              permissionRequestId: 'test',
            },
          }}
        />,
        { state: mockInitialState },
      );

      // First find and click the edit button on PermissionsSummary to show MultiSelector
      const editNetworksButton = getByTestId(
        ConnectedAccountsSelectorsIDs.NAVIGATE_TO_EDIT_NETWORKS_PERMISSIONS_BUTTON,
      );
      fireEvent.press(editNetworksButton);

      // Verify that the network selector screen is shown
      const updateButton = await findByTestId(
        'multiconnect-connect-network-button',
      );
      expect(updateButton).toBeOnTheScreen();

      // Click the update button to go back to permission summary
      fireEvent.press(updateButton);

      // Verify that the screen changed back to PermissionsSummary
      expect(
        await findByTestId('permission-summary-container'),
      ).toBeOnTheScreen();
    });
    it('invokes onSubmit property and renders permissions summary', async () => {
      // Render the container component with necessary props
      const { getByTestId, UNSAFE_getByType, findByTestId } =
        renderWithProvider(
          <AccountConnect
            route={{
              params: {
                hostInfo: {
                  metadata: {
                    id: 'mockId',
                    // Using a valid URL format to ensure PermissionsSummary renders first
                    origin: 'https://example.com',
                  },
                  permissions: createMockCaip25Permission({
                    'wallet:eip155': {
                      accounts: [],
                    },
                  }),
                },
                permissionRequestId: 'test',
              },
            }}
          />,
          { state: mockInitialState },
        );

      // First find and click the edit button on PermissionsSummary to show MultiSelector
      const editButton = getByTestId('permission-summary-container');
      fireEvent.press(editButton);

      // Using UNSAFE_getByType to access onPrimaryActionButtonPress prop directly for coverage
      const multiSelector = UNSAFE_getByType(AccountConnectMultiSelector);

      // Now we can access the component's props
      multiSelector.props.onSubmit([`eip155:0:${mockAddress2}`]);

      // Verify that the screen changed back to PermissionsSummary
      expect(
        await findByTestId('permission-summary-container'),
      ).toBeOnTheScreen();
    });
  });

  it('should handle cancel button press correctly', () => {
    const { getByTestId } = renderWithProvider(
      <AccountConnect
        route={{
          params: {
            hostInfo: {
              metadata: {
                id: 'mockId',
                origin: 'mockOrigin',
              },
              permissions: createMockCaip25Permission({
                'wallet:eip155': {
                  accounts: [],
                },
              }),
            },
            permissionRequestId: 'test',
          },
        }}
      />,
      { state: mockInitialState },
    );

    const cancelButton = getByTestId('cancel-button');
    fireEvent.press(cancelButton);

    // Verify that the trackEvent was called
    expect(mockedTrackEvent).toHaveBeenCalled();
    // Verify the permission request was rejected
    expect(
      Engine.context.PermissionController.rejectPermissionsRequest,
    ).toHaveBeenCalledWith('test');
    // Verify removeChannel was called with correct parameters
    expect(mockRemoveChannel).toHaveBeenCalledWith({
      channelId: 'mockOrigin',
      sendTerminate: true,
    });
    // Verify createEventBuilder was called
    expect(mockCreateEventBuilder).toHaveBeenCalled();
  });

  it('should handle confirm button press correctly', async () => {
    // Mock the acceptPermissionsRequest to resolve successfully
    const mockAcceptPermissionsRequest = jest.fn().mockResolvedValue(undefined);
    const mockUpdateCaveat = jest.fn();
    const mockGrantPermissionsIncremental = jest.fn();

    // Override the Engine mock for this test
    Engine.context.PermissionController.acceptPermissionsRequest =
      mockAcceptPermissionsRequest;
    Engine.context.PermissionController.updateCaveat = mockUpdateCaveat;
    Engine.context.PermissionController.grantPermissionsIncremental =
      mockGrantPermissionsIncremental;

    const { getByTestId } = renderWithProvider(
      <AccountConnect
        route={{
          params: {
            hostInfo: {
              metadata: {
                id: 'mockId',
                origin: 'https://example.com',
                isEip1193Request: true,
              },
              permissions: createMockCaip25Permission({
                'wallet:eip155': {
                  accounts: [],
                },
              }),
            },
            permissionRequestId: 'test-confirm',
          },
        }}
      />,
      { state: mockInitialState },
    );

    // Find and click the confirm button
    const confirmButton = getByTestId('connect-button');
    fireEvent.press(confirmButton);

    // Wait for async operations to complete
    await waitFor(() => {
      // Verify that acceptPermissionsRequest was called
      expect(mockAcceptPermissionsRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            origin: 'https://example.com',
            id: 'mockId',
            isEip1193Request: true,
          }),
          permissions: expect.objectContaining({
            [Caip25EndowmentPermissionName]: expect.any(Object),
          }),
        }),
      );
    });
  });

  it('handles confirm button press correctly when merging existing CAIP-25 permissions', async () => {
    const mockAcceptPermissionsRequest = jest.fn().mockResolvedValue(undefined);
    Engine.context.PermissionController.acceptPermissionsRequest =
      mockAcceptPermissionsRequest;

    const existingCaveat = {
      type: Caip25CaveatType,
      value: {
        requiredScopes: {},
        optionalScopes: {
          'eip155:1': { accounts: [`eip155:1:${mockAddress1}`] },
        },
        isMultichainOrigin: false,
        sessionProperties: {},
      },
    };

    (
      Engine.context.PermissionController.getCaveat as jest.Mock
    ).mockReturnValue(existingCaveat);

    const newPermissions = createMockCaip25Permission({
      'eip155:10': { accounts: [`eip155:10:${mockAddress2}`] },
    });

    const { getByTestId } = renderWithProvider(
      <AccountConnect
        route={{
          params: {
            hostInfo: {
              metadata: {
                id: 'mockId',
                origin: 'https://example.com',
                isEip1193Request: true,
              },
              permissions: newPermissions,
            },
            permissionRequestId: 'test-merge-confirm',
          },
        }}
      />,
      { state: mockInitialState },
    );

    const confirmButton = getByTestId('connect-button');
    fireEvent.press(confirmButton);

    await waitFor(() => {
      // Verify that acceptPermissionsRequest was called with merged permissions
      expect(mockAcceptPermissionsRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          permissions: expect.objectContaining({
            [Caip25EndowmentPermissionName]: expect.objectContaining({
              caveats: expect.arrayContaining([
                expect.objectContaining({
                  type: Caip25CaveatType,
                  value: expect.objectContaining({
                    optionalScopes: expect.any(Object),
                  }),
                }),
              ]),
            }),
          }),
        }),
      );
    });
  });

  it('AccountConnect should not change origin if browser URL changes', () => {
    // Setup a mock store with browser tabs
    const originalURL = 'https://dapp-requesting-connection.com';
    const parsedOriginalURL = new URL(originalURL);
    const mockState = {
      browser: {
        activeTab: 1,
        tabs: [{ id: 1, url: originalURL }],
      },
      engine: {
        backgroundState: {
          ...backgroundState,
          AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
        },
      },
    };

    // Create a function for rendering that we can use in our test
    const renderComponent = () =>
      renderWithProvider(
        <AccountConnect
          route={{
            params: {
              hostInfo: {
                metadata: {
                  id: 'mockId',
                  origin: originalURL,
                },
                permissions: {
                  eth_accounts: { parentCapability: 'eth_accounts' },
                },
              },
              permissionRequestId: 'test-id',
            },
          }}
        />,
        { state: mockState },
      );

    // Execute the render function (may succeed or fail)
    let result = renderComponent();

    // check that component with testID 'permission-network-permissions-container' is rendered
    // with the correct origin
    const permissionsRequestOriginWrap = result.getByTestId(
      PermissionSummaryBottomSheetSelectorsIDs.NETWORK_PERMISSIONS_CONTAINER,
    );
    // check if this wrap component includes the original URL
    expect(permissionsRequestOriginWrap).toBeDefined();
    // get inner text of permissionsRequestOriginWrap and check for original URL
    const permissionsRequestOriginText =
      // @ts-expect-error - This is a valid way to access the children of the permissionsRequestOriginWrap component
      permissionsRequestOriginWrap.children[0].children[0].props.children;
    expect(permissionsRequestOriginText).toContain(parsedOriginalURL.hostname);

    // now change the mockState to have a different active tab URL
    const newURL = 'https://different-site.com';
    mockState.browser.tabs[0].url = newURL;
    // re-render the component
    result = renderComponent();
    // check that the component with testID 'permission-network-permissions-container' is rendered
    // with the correct origin
    expect(
      result.getByTestId(
        PermissionSummaryBottomSheetSelectorsIDs.NETWORK_PERMISSIONS_CONTAINER,
      ),
    ).toBeDefined();
    expect(permissionsRequestOriginText).toContain(parsedOriginalURL.hostname);
    expect(permissionsRequestOriginText).not.toContain(
      new URL(newURL).hostname,
    );
  });

  describe('Phishing detection', () => {
    describe('dapp scanning is enabled', () => {
      it('should show phishing modal for phishing URLs', async () => {
        const { findByText } = renderWithProvider(
          <AccountConnect
            route={{
              params: {
                hostInfo: {
                  metadata: {
                    id: 'mockId',
                    origin: 'phishing.com',
                  },
                  permissions: {
                    eth_accounts: {
                      parentCapability: 'eth_accounts',
                    },
                  },
                },
                permissionRequestId: 'test',
              },
            }}
          />,
          { state: mockInitialState },
        );

        const warningText = await findByText(
          `MetaMask flagged the site you're trying to visit as potentially deceptive. Attackers may trick you into doing something dangerous.`,
        );
        expect(warningText).toBeTruthy();
        expect(Engine.context.PhishingController.scanUrl).toHaveBeenCalledWith(
          'https://phishing.com',
        );
      });

      it('should not show phishing modal for safe URLs', async () => {
        const { queryByText } = renderWithProvider(
          <AccountConnect
            route={{
              params: {
                hostInfo: {
                  metadata: {
                    id: 'mockId',
                    origin: 'safe-site.com',
                  },
                  permissions: {
                    eth_accounts: {
                      parentCapability: 'eth_accounts',
                    },
                  },
                },
                permissionRequestId: 'test',
              },
            }}
          />,
          { state: mockInitialState },
        );

        const warningText = queryByText(
          `MetaMask flagged the site you're trying to visit as potentially deceptive.`,
        );
        expect(warningText).toBeNull();
        expect(Engine.context.PhishingController.scanUrl).toHaveBeenCalledWith(
          'https://safe-site.com',
        );
      });
    });
  });

  describe('CreateInitialAccount', () => {
    it('creates the initial solana account', async () => {
      const { getByTestId } = renderWithProvider(
        <AccountConnect
          route={{
            params: {
              hostInfo: {
                metadata: {
                  id: 'mockId',
                  origin: 'mockOrigin',
                  promptToCreateSolanaAccount: true,
                },
                permissions: {
                  [Caip25EndowmentPermissionName]: {
                    parentCapability: Caip25EndowmentPermissionName,
                    caveats: [
                      {
                        type: Caip25CaveatType,
                        value: {
                          requiredScopes: {},
                          optionalScopes: {
                            'wallet:eip155': {
                              accounts: [],
                            },
                          },
                          isMultichainOrigin: false,
                          sessionProperties: {},
                        },
                      },
                    ],
                  },
                },
              },
              permissionRequestId: 'test',
            },
          }}
        />,
        { state: mockInitialState },
      );

      const addAccountButton = getByTestId(
        AccountConnectSelectorsIDs.CREATE_ACCOUNT_BUTTON,
      );

      expect(addAccountButton).toBeDefined();

      fireEvent.press(addAccountButton);

      expect(getByTestId(AddNewAccountIds.CONTAINER)).toBeDefined();

      const confirmButton = getByTestId(AddNewAccountIds.CONFIRM);

      fireEvent.press(confirmButton);

      await waitFor(() => {
        expect(
          mockMultichainWalletSnapClient.createAccount,
        ).toHaveBeenCalledWith({
          scope: SolScope.Mainnet,
          accountNameSuggestion: 'Solana Account 1',
          entropySource: mockKeyringId,
        });
      });
    });
  });

  describe('Domain title and hostname logic', () => {
    beforeEach(() => {
      // Reset mocks before each test
      mockGetConnection.mockReset();
      mockGetConnection.mockReturnValue(undefined); // Default behavior
      mockIsUUID.mockReset();
      mockIsUUID.mockReturnValue(false); // Default behavior
      jest.clearAllMocks();
    });

    it('should handle MMSDK remote connection origin correctly', () => {
      const mockOrigin = 'https://example-dapp.com';
      const mockChannelId = `metamask-sdk://connect?redirect=${mockOrigin}`;

      // Mock SDKConnect to return a connection (isOriginMMSDKRemoteConn = true)
      mockGetConnection.mockReturnValue({
        originatorInfo: { url: 'https://test.com' },
      });

      // Mock isUUID to return false for this channelId
      mockIsUUID.mockReturnValue(false);

      const mockStateWithoutWC2 = {
        ...mockInitialState,
        sdk: {
          wc2Metadata: { id: '' }, // Empty to avoid WalletConnect branch
        },
      };

      const { getByTestId } = renderWithProvider(
        <AccountConnect
          route={{
            params: {
              hostInfo: {
                metadata: {
                  id: 'mockId',
                  origin: mockChannelId,
                },
                permissions: createMockCaip25Permission({
                  'wallet:eip155': {
                    accounts: [],
                  },
                }),
              },
              permissionRequestId: 'test',
            },
          }}
        />,
        { state: mockStateWithoutWC2 },
      );

      // Verify the component renders correctly with MMSDK remote connection
      const permissionsContainer = getByTestId('permission-summary-container');
      expect(permissionsContainer).toBeDefined();
      expect(mockGetConnection).toHaveBeenCalledWith({
        channelId: mockChannelId,
      });
    });

    it('should handle WalletConnect origin correctly', () => {
      const mockChannelId = 'walletconnect-origin.com';

      // Mock SDKConnect to return undefined (isOriginMMSDKRemoteConn = false)
      mockGetConnection.mockReturnValue(undefined);

      // Mock isUUID to return false
      mockIsUUID.mockReturnValue(false);

      const mockStateWithWC2 = {
        ...mockInitialState,
        sdk: {
          wc2Metadata: { id: 'mock-wc2-id' }, // Non-empty to trigger WalletConnect branch
        },
      };

      const { getByTestId } = renderWithProvider(
        <AccountConnect
          route={{
            params: {
              hostInfo: {
                metadata: {
                  id: 'mockId',
                  origin: mockChannelId,
                },
                permissions: createMockCaip25Permission({
                  'wallet:eip155': {
                    accounts: [],
                  },
                }),
              },
              permissionRequestId: 'test',
            },
          }}
        />,
        { state: mockStateWithWC2 },
      );

      // Verify the component renders correctly with WalletConnect
      const permissionsContainer = getByTestId('permission-summary-container');
      expect(permissionsContainer).toBeDefined();
      expect(mockGetConnection).toHaveBeenCalledWith({
        channelId: mockChannelId,
      });
    });

    it('should handle unknown SDK origin correctly and set isSdkUrlUnknown to true', () => {
      const mockChannelId = '550e8400-e29b-41d4-a716-446655440000'; // UUID format

      // Mock SDKConnect to return undefined (isOriginMMSDKRemoteConn = false)
      mockGetConnection.mockReturnValue(undefined);

      // Mock isUUID to return true (isChannelId = true)
      mockIsUUID.mockReturnValue(true);

      const mockStateWithoutWC2 = {
        ...mockInitialState,
        sdk: {
          wc2Metadata: { id: '' }, // Empty to avoid WalletConnect branch
        },
      };

      const { getByTestId } = renderWithProvider(
        <AccountConnect
          route={{
            params: {
              hostInfo: {
                metadata: {
                  id: 'mockId',
                  origin: mockChannelId,
                },
                permissions: createMockCaip25Permission({
                  'wallet:eip155': {
                    accounts: [],
                  },
                }),
              },
              permissionRequestId: 'test',
            },
          }}
        />,
        { state: mockStateWithoutWC2 },
      );

      // Verify the component renders correctly with unknown SDK
      const permissionsContainer = getByTestId('permission-summary-container');
      expect(permissionsContainer).toBeDefined();
      expect(mockGetConnection).toHaveBeenCalledWith({
        channelId: mockChannelId,
      });
      expect(mockIsUUID).toHaveBeenCalledWith(mockChannelId);
    });
  });
});
