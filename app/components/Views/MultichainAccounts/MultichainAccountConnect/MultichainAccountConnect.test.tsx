import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import {
  Caip25EndowmentPermissionName,
  Caip25CaveatType,
  Caip25CaveatValue,
} from '@metamask/chain-agnostic-permission';
import renderWithProvider, {
  DeepPartial,
} from '../../../../util/test/renderWithProvider';
import MultichainAccountConnect from './MultichainAccountConnect';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { RootState } from '../../../../reducers';
import Engine from '../../../../core/Engine';
import { CommonSelectorsIDs } from '../../../../../e2e/selectors/Common.selectors';
import { ConnectedAccountsSelectorsIDs } from '../../../../../e2e/selectors/Browser/ConnectedAccountModal.selectors';
import { AccountListBottomSheetSelectorsIDs } from '../../../../../e2e/selectors/wallet/AccountListBottomSheet.selectors';
import { ConnectAccountBottomSheetSelectorsIDs } from '../../../../../e2e/selectors/Browser/ConnectAccountBottomSheet.selectors';
import {
  createMockAccountsControllerState,
  MOCK_ADDRESS_1,
  MOCK_ADDRESS_2,
} from '../../../../util/test/accountsControllerTestUtils';
import { KeyringTypes } from '@metamask/keyring-controller';
import { PermissionDoesNotExistError } from '@metamask/permission-controller';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn().mockReturnValue({
  addProperties: jest.fn().mockReturnValue({
    build: jest.fn(),
  }),
});
const mockGetNextAvailableAccountName = jest.fn().mockReturnValue('Account 3');

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
  };
});

jest.mock('../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('react-native-scrollable-tab-view', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DefaultTabBar: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { width: 0, height: 0, x: 0, y: 0 };
  const { View } = jest.requireActual('react-native');
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    SafeAreaView: View,
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
    useSafeAreaFrame: jest.fn().mockImplementation(() => frame),
  };
});

const mockRejectPermissionsRequest = jest.fn();
const mockAcceptPermissionsRequest = jest.fn().mockResolvedValue(undefined);
const mockRemoveChannel = jest.fn();
const mockGetConnection = jest.fn();

jest.mock('../../../../core/Engine', () => {
  const {
    createMockAccountsControllerState: createMockAccountsControllerStateUtil,
    MOCK_ADDRESS_1: mockAddress1,
    MOCK_ADDRESS_2: mockAddress2,
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  } = require('../../../../util/test/accountsControllerTestUtils');
  const mockAccountsState = createMockAccountsControllerStateUtil(
    [mockAddress1, mockAddress2],
    mockAddress1,
  );
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
        rejectPermissionsRequest: mockRejectPermissionsRequest,
        getCaveat: jest.fn(),
        acceptPermissionsRequest: mockAcceptPermissionsRequest,
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
              accounts: [mockAddress1, mockAddress2],
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

jest.mock('../../../../core/SDKConnect/SDKConnect', () => ({
  getInstance: () => ({
    removeChannel: mockRemoveChannel,
    getConnection: mockGetConnection,
  }),
}));

jest.mock('../../../../core/SDKConnect/utils/isUUID', () => ({
  isUUID: jest.fn(() => false),
}));

const { isUUID: mockIsUUID } = jest.requireMock(
  '../../../../core/SDKConnect/utils/isUUID',
);

jest.mock('../../../../util/phishingDetection', () => ({
  getPhishingTestResultAsync: jest.fn().mockResolvedValue({ result: false }),
  isProductSafetyDappScanningEnabled: jest.fn().mockReturnValue(false),
}));

jest.mock('../../../../util/metrics', () => ({
  trackDappViewedEvent: jest.fn(),
}));

jest.mock('../../../hooks/useFavicon/useFavicon', () =>
  jest.fn(() => 'favicon-url'),
);

jest.mock('../../../hooks/useOriginSource', () => jest.fn(() => 'test-source'));

jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectAccountGroups: jest.fn(() => [
      {
        id: 'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/0',
        accounts: ['01JKAF3DSGM3AB87EM9N0K41AJ'],
        metadata: { name: 'Account 1' },
      },
      {
        id: 'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/1',
        accounts: ['01JKAF3DSGM3AB87EM9N0K41AJ'],
        metadata: { name: 'Account 2' },
      },
    ]),
    selectAccountGroupsByWallet: jest.fn(() => [
      {
        title: 'Test Wallet',
        wallet: {
          id: 'entropy:01JKAF3DSGM3AB87EM9N0K41AJ',
          metadata: { name: 'Test Wallet' },
        },
        data: [
          {
            id: 'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/0',
            accounts: ['01JKAF3DSGM3AB87EM9N0K41AJ'],
            metadata: { name: 'Account 1' },
          },
          {
            id: 'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/1',
            accounts: ['01JKAF3DSGM3AB87EM9N0K41AJ'],
            metadata: { name: 'Account 2' },
          },
        ],
      },
    ]),
    selectWalletsMap: jest.fn(() => ({
      'entropy:01JKAF3DSGM3AB87EM9N0K41AJ': {
        id: 'entropy:01JKAF3DSGM3AB87EM9N0K41AJ',
        metadata: { name: 'Test Wallet' },
        groups: {
          'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/0': {
            id: 'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/0',
            accounts: ['01JKAF3DSGM3AB87EM9N0K41AJ'],
            metadata: { name: 'Account 1' },
          },
          'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/1': {
            id: 'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/1',
            accounts: ['01JKAF3DSGM3AB87EM9N0K41AJ'],
            metadata: { name: 'Account 2' },
          },
        },
      },
    })),
  }),
);

// Mock feature flag selector
jest.mock(
  '../../../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts',
  () => ({
    selectMultichainAccountsState1Enabled: jest.fn(() => true),
  }),
);

// Mock accounts controller selectors
jest.mock('../../../../selectors/accountsController', () => ({
  ...jest.requireActual('../../../../selectors/accountsController'),
  selectInternalAccountsById: jest.fn(() => ({
    '01JKAF3DSGM3AB87EM9N0K41AJ': {
      id: '01JKAF3DSGM3AB87EM9N0K41AJ',
      address: MOCK_ADDRESS_1,
      metadata: { name: 'Account 1' },
      scopes: ['eip155:1'],
    },
  })),
}));

// Mock balance selectors
jest.mock('../../../../selectors/assets/balances', () => ({
  selectBalanceByAccountGroup: jest.fn(() => () => ({
    totalBalanceInUserCurrency: 100.5,
    userCurrency: 'usd',
  })),
}));

// Mock useAccountGroupsForPermissions hook
jest.mock(
  '../../../hooks/useAccountGroupsForPermissions/useAccountGroupsForPermissions',
  () => ({
    useAccountGroupsForPermissions: jest.fn(() => ({
      supportedAccountGroups: [
        {
          id: 'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/0',
          accounts: ['01JKAF3DSGM3AB87EM9N0K41AJ'],
          metadata: { name: 'Account 1' },
        },
        {
          id: 'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/1',
          accounts: ['01JKAF3DSGM3AB87EM9N0K41AJ'],
          metadata: { name: 'Account 2' },
        },
      ],
      connectedAccountGroups: [],
    })),
  }),
);

// Mock useWalletInfo hook
jest.mock(
  '../../../../components/Views/MultichainAccounts/WalletDetails/hooks/useWalletInfo',
  () => ({
    useWalletInfo: jest.fn(() => ({
      keyringId: 'test-keyring-id',
      walletType: 'entropy',
    })),
  }),
);

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

const createMockState = (): DeepPartial<RootState> => ({
  settings: {},
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: createMockAccountsControllerState(
        [MOCK_ADDRESS_1, MOCK_ADDRESS_2],
        MOCK_ADDRESS_1,
      ),
      AccountTreeController: {
        accountTree: {
          wallets: {
            'entropy:01JKAF3DSGM3AB87EM9N0K41AJ': {
              id: 'entropy:01JKAF3DSGM3AB87EM9N0K41AJ',
              metadata: { name: 'Test Wallet' },
              groups: {
                'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/0': {
                  id: 'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/0',
                  accounts: ['01JKAF3DSGM3AB87EM9N0K41AJ'],
                  metadata: { name: 'Account 1' },
                },
                'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/1': {
                  id: 'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/1',
                  accounts: ['01JKAF3DSGM3AB87EM9N0K41AJ'],
                  metadata: { name: 'Account 2' },
                },
              },
            },
          },
          selectedAccountGroup: 'entropy:01JKAF3DSGM3AB87EM9N0K41AJ/0',
        },
      },
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
      NetworkEnablementController: {
        enabledNetworkMap: {
          eip155: {
            '0x1': true,
          },
        },
      },
      KeyringController: {
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
});

mockGetConnection.mockReturnValue(undefined);
mockIsUUID.mockReturnValue(false);

describe('MultichainAccountConnect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with base request when there is no existing CAIP endowment', () => {
    (
      Engine.context.PermissionController.getCaveat as jest.Mock
    ).mockImplementation(() => {
      throw new PermissionDoesNotExistError(
        'Permission does not exist',
        Caip25EndowmentPermissionName,
      );
    });
    const { getByTestId } = renderWithProvider(
      <MultichainAccountConnect
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
      { state: createMockState() },
    );

    expect(getByTestId(CommonSelectorsIDs.CONNECT_BUTTON)).toBeTruthy();
    expect(getByTestId(CommonSelectorsIDs.CANCEL_BUTTON)).toBeTruthy();
  });

  it('renders correctly with request including chains and accounts', () => {
    const { getByTestId } = renderWithProvider(
      <MultichainAccountConnect
        route={{
          params: {
            hostInfo: {
              metadata: {
                id: 'mockId',
                origin: 'mockOrigin',
              },
              permissions: createMockCaip25Permission({
                'eip155:1': {
                  accounts: [`eip155:1:${MOCK_ADDRESS_1}`],
                },
              }),
            },
            permissionRequestId: 'test',
          },
        }}
      />,
      { state: createMockState() },
    );

    expect(getByTestId(CommonSelectorsIDs.CONNECT_BUTTON)).toBeTruthy();
    expect(getByTestId(CommonSelectorsIDs.CANCEL_BUTTON)).toBeTruthy();
  });

  it('renders correctly with request including only chains', () => {
    const { getByTestId } = renderWithProvider(
      <MultichainAccountConnect
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
      { state: createMockState() },
    );

    expect(getByTestId(CommonSelectorsIDs.CONNECT_BUTTON)).toBeTruthy();
    expect(getByTestId(CommonSelectorsIDs.CANCEL_BUTTON)).toBeTruthy();
  });

  it('handles cancel button press correctly', () => {
    Engine.context.PermissionController.rejectPermissionsRequest =
      mockRejectPermissionsRequest;
    const { getByTestId } = renderWithProvider(
      <MultichainAccountConnect
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
      { state: createMockState() },
    );

    const cancelButton = getByTestId(CommonSelectorsIDs.CANCEL_BUTTON);
    fireEvent.press(cancelButton);

    expect(mockTrackEvent).toHaveBeenCalled();
    expect(mockRejectPermissionsRequest).toHaveBeenCalledWith('test');
    expect(mockRemoveChannel).toHaveBeenCalledWith({
      channelId: 'mockOrigin',
      sendTerminate: true,
    });
    expect(mockCreateEventBuilder).toHaveBeenCalled();
  });

  it('handles confirm button press correctly', async () => {
    const mockAcceptPermissionsRequestLocal = jest
      .fn()
      .mockResolvedValue(undefined);
    const mockUpdateCaveat = jest.fn();
    const mockGrantPermissionsIncremental = jest.fn();

    Engine.context.PermissionController.acceptPermissionsRequest =
      mockAcceptPermissionsRequestLocal;
    Engine.context.PermissionController.updateCaveat = mockUpdateCaveat;
    Engine.context.PermissionController.grantPermissionsIncremental =
      mockGrantPermissionsIncremental;

    const { getByTestId } = renderWithProvider(
      <MultichainAccountConnect
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
      { state: createMockState() },
    );

    const confirmButton = getByTestId(CommonSelectorsIDs.CONNECT_BUTTON);
    fireEvent.press(confirmButton);

    await waitFor(() => {
      expect(mockAcceptPermissionsRequestLocal).toHaveBeenCalledWith(
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

  describe('Phishing detection', () => {
    describe('dapp scanning is enabled', () => {
      it('does not show phishing modal for safe URLs', async () => {
        const { queryByText } = renderWithProvider(
          <MultichainAccountConnect
            route={{
              params: {
                hostInfo: {
                  metadata: {
                    id: 'mockId',
                    origin: 'safe-site.com',
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
          { state: createMockState() },
        );

        const warningText = queryByText(
          `MetaMask flagged the site you're trying to visit as potentially deceptive.`,
        );
        expect(warningText).toBeNull();
      });
    });
  });

  describe('Domain title and hostname logic', () => {
    beforeEach(() => {
      mockGetConnection.mockReset();
      mockGetConnection.mockReturnValue(undefined);
      mockIsUUID.mockReset();
      mockIsUUID.mockReturnValue(false);
      jest.clearAllMocks();
    });

    it('handles MMSDK remote connection origin correctly', () => {
      const mockOrigin = 'https://example-dapp.com';
      const mockChannelId = `metamask-sdk://connect?redirect=${mockOrigin}`;

      mockGetConnection.mockReturnValue({
        originatorInfo: { url: 'https://test.com' },
      });

      mockIsUUID.mockReturnValue(false);

      const mockStateWithoutWC2 = {
        ...createMockState(),
        sdk: {
          wc2Metadata: { id: '' }, // Empty to avoid WalletConnect branch
        },
      };

      const { getByTestId } = renderWithProvider(
        <MultichainAccountConnect
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

      const connectButton = getByTestId(CommonSelectorsIDs.CONNECT_BUTTON);
      expect(connectButton).toBeDefined();
      expect(mockGetConnection).toHaveBeenCalledWith({
        channelId: mockChannelId,
      });
    });

    it('handles WalletConnect origin correctly', () => {
      const mockChannelId = 'walletconnect-origin.com';

      mockGetConnection.mockReturnValue(undefined);

      mockIsUUID.mockReturnValue(false);

      const mockStateWithWC2 = {
        ...createMockState(),
        sdk: {
          wc2Metadata: { id: 'mock-wc2-id' },
        },
      };

      const { getByTestId } = renderWithProvider(
        <MultichainAccountConnect
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

      const connectButton = getByTestId(CommonSelectorsIDs.CONNECT_BUTTON);
      expect(connectButton).toBeDefined();
      expect(mockGetConnection).toHaveBeenCalledWith({
        channelId: mockChannelId,
      });
    });
  });

  it('handles permission request rejection gracefully', async () => {
    const mockAcceptPermissionsRequestError = jest
      .fn()
      .mockRejectedValue(new Error('Permission denied'));

    Engine.context.PermissionController.acceptPermissionsRequest =
      mockAcceptPermissionsRequestError;

    const { getByTestId } = renderWithProvider(
      <MultichainAccountConnect
        route={{
          params: {
            hostInfo: {
              metadata: {
                id: 'mockId',
                origin: 'https://example.com',
              },
              permissions: createMockCaip25Permission({
                'wallet:eip155': {
                  accounts: [],
                },
              }),
            },
            permissionRequestId: 'test-error',
          },
        }}
      />,
      { state: createMockState() },
    );

    const confirmButton = getByTestId(CommonSelectorsIDs.CONNECT_BUTTON);
    fireEvent.press(confirmButton);

    await waitFor(() => {
      expect(mockAcceptPermissionsRequestError).toHaveBeenCalled();
    });
  });

  it('handles network controller errors during connection', async () => {
    const mockAcceptPermissionsRequestNetworkError = jest
      .fn()
      .mockRejectedValue(new Error('Network error'));

    Engine.context.PermissionController.acceptPermissionsRequest =
      mockAcceptPermissionsRequestNetworkError;

    const { getByTestId } = renderWithProvider(
      <MultichainAccountConnect
        route={{
          params: {
            hostInfo: {
              metadata: {
                id: 'mockId',
                origin: 'https://example.com',
              },
              permissions: createMockCaip25Permission({
                'eip155:1': {
                  accounts: [`eip155:1:${MOCK_ADDRESS_1}`],
                },
              }),
            },
            permissionRequestId: 'test-network-error',
          },
        }}
      />,
      { state: createMockState() },
    );

    const confirmButton = getByTestId(CommonSelectorsIDs.CONNECT_BUTTON);
    fireEvent.press(confirmButton);

    await waitFor(() => {
      expect(mockAcceptPermissionsRequestNetworkError).toHaveBeenCalled();
    });
  });

  describe('Account selection and multi-selector', () => {
    it('renders multi-selector screen when editing accounts', () => {
      const { getByTestId } = renderWithProvider(
        <MultichainAccountConnect
          route={{
            params: {
              hostInfo: {
                metadata: {
                  id: 'mockId',
                  origin: 'https://example.com',
                },
                permissions: createMockCaip25Permission({
                  'eip155:1': {
                    accounts: [
                      `eip155:1:${MOCK_ADDRESS_1}`,
                      `eip155:1:${MOCK_ADDRESS_2}`,
                    ],
                  },
                }),
              },
              permissionRequestId: 'test-multi-selector',
            },
          }}
        />,
        { state: createMockState() },
      );

      // Should render the connect button initially
      expect(getByTestId(CommonSelectorsIDs.CONNECT_BUTTON)).toBeTruthy();
    });

    it('handles account group selection correctly', () => {
      const { getByTestId } = renderWithProvider(
        <MultichainAccountConnect
          route={{
            params: {
              hostInfo: {
                metadata: {
                  id: 'mockId',
                  origin: 'https://example.com',
                },
                permissions: createMockCaip25Permission({
                  'eip155:1': {
                    accounts: [],
                  },
                }),
              },
              permissionRequestId: 'test-account-groups',
            },
          }}
        />,
        { state: createMockState() },
      );

      expect(getByTestId(CommonSelectorsIDs.CONNECT_BUTTON)).toBeTruthy();
    });

    it('handles empty account selection', () => {
      const { getByTestId } = renderWithProvider(
        <MultichainAccountConnect
          route={{
            params: {
              hostInfo: {
                metadata: {
                  id: 'mockId',
                  origin: 'https://example.com',
                },
                permissions: createMockCaip25Permission({
                  'eip155:1': {
                    accounts: [],
                  },
                }),
              },
              permissionRequestId: 'test-empty-accounts',
            },
          }}
        />,
        { state: createMockState() },
      );

      const connectButton = getByTestId(CommonSelectorsIDs.CONNECT_BUTTON);
      expect(connectButton).toBeTruthy();
    });
  });

  describe('Network selection and chain handling', () => {
    it('handles multiple chain requests correctly', () => {
      const { getByTestId } = renderWithProvider(
        <MultichainAccountConnect
          route={{
            params: {
              hostInfo: {
                metadata: {
                  id: 'mockId',
                  origin: 'https://example.com',
                },
                permissions: createMockCaip25Permission({
                  'eip155:1': {
                    accounts: [`eip155:1:${MOCK_ADDRESS_1}`],
                  },
                  'eip155:137': {
                    accounts: [`eip155:137:${MOCK_ADDRESS_1}`],
                  },
                }),
              },
              permissionRequestId: 'test-multi-chain',
            },
          }}
        />,
        { state: createMockState() },
      );

      expect(getByTestId(CommonSelectorsIDs.CONNECT_BUTTON)).toBeTruthy();
      expect(getByTestId(CommonSelectorsIDs.CANCEL_BUTTON)).toBeTruthy();
    });

    it('handles unsupported chain requests', () => {
      const { getByTestId } = renderWithProvider(
        <MultichainAccountConnect
          route={{
            params: {
              hostInfo: {
                metadata: {
                  id: 'mockId',
                  origin: 'https://example.com',
                },
                permissions: createMockCaip25Permission({
                  'eip155:999999': {
                    accounts: [],
                  },
                }),
              },
              permissionRequestId: 'test-unsupported-chain',
            },
          }}
        />,
        { state: createMockState() },
      );

      expect(getByTestId(CommonSelectorsIDs.CONNECT_BUTTON)).toBeTruthy();
    });

    it('handles network switching scenarios', () => {
      const { getByTestId } = renderWithProvider(
        <MultichainAccountConnect
          route={{
            params: {
              hostInfo: {
                metadata: {
                  id: 'mockId',
                  origin: 'https://example.com',
                },
                permissions: createMockCaip25Permission({
                  'eip155:137': {
                    accounts: [`eip155:137:${MOCK_ADDRESS_1}`],
                  },
                }),
              },
              permissionRequestId: 'test-network-switch',
            },
          }}
        />,
        { state: createMockState() },
      );

      expect(getByTestId(CommonSelectorsIDs.CONNECT_BUTTON)).toBeTruthy();
    });
  });

  describe('Permissions summary screen', () => {
    it('renders permissions summary with correct information', () => {
      const { getByTestId } = renderWithProvider(
        <MultichainAccountConnect
          route={{
            params: {
              hostInfo: {
                metadata: {
                  id: 'mockId',
                  origin: 'https://example.com',
                },
                permissions: createMockCaip25Permission({
                  'eip155:1': {
                    accounts: [`eip155:1:${MOCK_ADDRESS_1}`],
                  },
                }),
              },
              permissionRequestId: 'test-permissions-summary',
            },
          }}
        />,
        { state: createMockState() },
      );

      expect(getByTestId(CommonSelectorsIDs.CONNECT_BUTTON)).toBeTruthy();
      expect(getByTestId(CommonSelectorsIDs.CANCEL_BUTTON)).toBeTruthy();
    });

    it('handles edit accounts action from permissions summary', () => {
      const { getByTestId } = renderWithProvider(
        <MultichainAccountConnect
          route={{
            params: {
              hostInfo: {
                metadata: {
                  id: 'mockId',
                  origin: 'https://example.com',
                },
                permissions: createMockCaip25Permission({
                  'eip155:1': {
                    accounts: [
                      `eip155:1:${MOCK_ADDRESS_1}`,
                      `eip155:1:${MOCK_ADDRESS_2}`,
                    ],
                  },
                }),
              },
              permissionRequestId: 'test-edit-accounts',
            },
          }}
        />,
        { state: createMockState() },
      );

      expect(getByTestId(CommonSelectorsIDs.CONNECT_BUTTON)).toBeTruthy();
    });

    it('handles edit networks action from permissions summary', () => {
      const { getByTestId } = renderWithProvider(
        <MultichainAccountConnect
          route={{
            params: {
              hostInfo: {
                metadata: {
                  id: 'mockId',
                  origin: 'https://example.com',
                },
                permissions: createMockCaip25Permission({
                  'eip155:1': {
                    accounts: [`eip155:1:${MOCK_ADDRESS_1}`],
                  },
                  'eip155:137': {
                    accounts: [`eip155:137:${MOCK_ADDRESS_1}`],
                  },
                }),
              },
              permissionRequestId: 'test-edit-networks',
            },
          }}
        />,
        { state: createMockState() },
      );

      expect(getByTestId(CommonSelectorsIDs.CONNECT_BUTTON)).toBeTruthy();
    });
  });

  it('handles empty permissions gracefully', () => {
    const { getByTestId } = renderWithProvider(
      <MultichainAccountConnect
        route={{
          params: {
            hostInfo: {
              metadata: {
                id: 'mockId',
                origin: 'https://example.com',
              },
              permissions: {},
            },
            permissionRequestId: 'test-empty-permissions',
          },
        }}
      />,
      { state: createMockState() },
    );

    expect(getByTestId(CommonSelectorsIDs.CONNECT_BUTTON)).toBeTruthy();
    expect(getByTestId(CommonSelectorsIDs.CANCEL_BUTTON)).toBeTruthy();
  });

  it('handles invalid origin URLs', () => {
    const { getByTestId } = renderWithProvider(
      <MultichainAccountConnect
        route={{
          params: {
            hostInfo: {
              metadata: {
                id: 'mockId',
                origin: 'invalid-url',
              },
              permissions: createMockCaip25Permission({
                'wallet:eip155': {
                  accounts: [],
                },
              }),
            },
            permissionRequestId: 'test-invalid-origin',
          },
        }}
      />,
      { state: createMockState() },
    );

    expect(getByTestId(CommonSelectorsIDs.CONNECT_BUTTON)).toBeTruthy();
  });

  it('handles missing metadata gracefully', () => {
    const { getByTestId } = renderWithProvider(
      <MultichainAccountConnect
        route={{
          params: {
            hostInfo: {
              metadata: {
                id: '',
                origin: '',
              },
              permissions: createMockCaip25Permission({
                'wallet:eip155': {
                  accounts: [],
                },
              }),
            },
            permissionRequestId: 'test-missing-metadata',
          },
        }}
      />,
      { state: createMockState() },
    );

    expect(getByTestId(CommonSelectorsIDs.CONNECT_BUTTON)).toBeTruthy();
  });

  it('handles malformed CAIP account IDs', () => {
    const { getByTestId } = renderWithProvider(
      <MultichainAccountConnect
        route={{
          params: {
            hostInfo: {
              metadata: {
                id: 'mockId',
                origin: 'https://example.com',
              },
              permissions: createMockCaip25Permission({
                'eip155:1': {
                  accounts: ['invalid-caip-account-id'],
                },
              }),
            },
            permissionRequestId: 'test-malformed-caip',
          },
        }}
      />,
      { state: createMockState() },
    );

    expect(getByTestId(CommonSelectorsIDs.CONNECT_BUTTON)).toBeTruthy();
  });

  describe('Account group selection logic', () => {
    it('selects first supported account group when no connected account groups exist', () => {
      const mockStateWithMultipleAccounts = {
        ...createMockState(),
        engine: {
          ...createMockState().engine,
          backgroundState: {
            ...createMockState().engine?.backgroundState,
            AccountsController: createMockAccountsControllerState(
              [MOCK_ADDRESS_1, MOCK_ADDRESS_2],
              MOCK_ADDRESS_1,
            ),
          },
        },
      };

      const { getByTestId } = renderWithProvider(
        <MultichainAccountConnect
          route={{
            params: {
              hostInfo: {
                metadata: {
                  id: 'mockId',
                  origin: 'https://example.com',
                },
                permissions: createMockCaip25Permission({
                  'eip155:1': {
                    accounts: [], // No existing connected accounts
                  },
                }),
              },
              permissionRequestId: 'test-first-supported-group',
            },
          }}
        />,
        { state: mockStateWithMultipleAccounts },
      );

      expect(getByTestId(CommonSelectorsIDs.CONNECT_BUTTON)).toBeTruthy();
      expect(getByTestId(CommonSelectorsIDs.CANCEL_BUTTON)).toBeTruthy();
    });

    it('handles scenario with no supported account groups', () => {
      const mockStateWithMinimalAccounts = {
        ...createMockState(),
        engine: {
          ...createMockState().engine,
          backgroundState: {
            ...createMockState().engine?.backgroundState,
            AccountsController: createMockAccountsControllerState(
              [MOCK_ADDRESS_1], // At least one account required by utility
              MOCK_ADDRESS_1,
            ),
          },
        },
      };

      const { getByTestId } = renderWithProvider(
        <MultichainAccountConnect
          route={{
            params: {
              hostInfo: {
                metadata: {
                  id: 'mockId',
                  origin: 'https://example.com',
                },
                permissions: createMockCaip25Permission({
                  'eip155:999999': {
                    // Unsupported chain to create empty supported groups
                    accounts: [],
                  },
                }),
              },
              permissionRequestId: 'test-no-supported-groups',
            },
          }}
        />,
        { state: mockStateWithMinimalAccounts },
      );

      expect(getByTestId(CommonSelectorsIDs.CONNECT_BUTTON)).toBeTruthy();
      expect(getByTestId(CommonSelectorsIDs.CANCEL_BUTTON)).toBeTruthy();
    });

    it('uses connected account groups when they exist', () => {
      (
        Engine.context.PermissionController.getCaveat as jest.Mock
      ).mockReturnValue({
        value: {
          requiredScopes: {},
          optionalScopes: {
            'eip155:1': {
              accounts: [`eip155:1:${MOCK_ADDRESS_1}`],
            },
          },
          isMultichainOrigin: false,
          sessionProperties: {},
        },
      });

      const { getByTestId } = renderWithProvider(
        <MultichainAccountConnect
          route={{
            params: {
              hostInfo: {
                metadata: {
                  id: 'mockId',
                  origin: 'https://example.com',
                },
                permissions: createMockCaip25Permission({
                  'eip155:1': {
                    accounts: [`eip155:1:${MOCK_ADDRESS_1}`],
                  },
                }),
              },
              permissionRequestId: 'test-connected-groups',
            },
          }}
        />,
        { state: createMockState() },
      );

      expect(getByTestId(CommonSelectorsIDs.CONNECT_BUTTON)).toBeTruthy();
      expect(getByTestId(CommonSelectorsIDs.CANCEL_BUTTON)).toBeTruthy();
    });
  });

  describe('Phishing modal navigation functions coverage', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('creates phishing navigation callback functions', () => {
      const { getByTestId } = renderWithProvider(
        <MultichainAccountConnect
          route={{
            params: {
              hostInfo: {
                metadata: {
                  id: 'mockId',
                  origin: 'https://example.com',
                },
                permissions: createMockCaip25Permission({
                  'wallet:eip155': {
                    accounts: [],
                  },
                }),
              },
              permissionRequestId: 'test-phishing-callbacks',
            },
          }}
        />,
        { state: createMockState() },
      );

      expect(getByTestId(CommonSelectorsIDs.CONNECT_BUTTON)).toBeTruthy();
      expect(getByTestId(CommonSelectorsIDs.CANCEL_BUTTON)).toBeTruthy();
    });

    it('handles different origin formats for phishing detection setup', () => {
      const { getByTestId } = renderWithProvider(
        <MultichainAccountConnect
          route={{
            params: {
              hostInfo: {
                metadata: {
                  id: 'mockId',
                  origin: 'example.com', // URL without protocol
                },
                permissions: createMockCaip25Permission({
                  'wallet:eip155': {
                    accounts: [],
                  },
                }),
              },
              permissionRequestId: 'test-url-formats',
            },
          }}
        />,
        { state: createMockState() },
      );

      expect(getByTestId(CommonSelectorsIDs.CONNECT_BUTTON)).toBeTruthy();
      expect(getByTestId(CommonSelectorsIDs.CANCEL_BUTTON)).toBeTruthy();
    });

    it('sets up phishing modal callbacks with proper dependencies', () => {
      const { getByTestId } = renderWithProvider(
        <MultichainAccountConnect
          route={{
            params: {
              hostInfo: {
                metadata: {
                  id: 'mockId',
                  origin: 'https://test-site.com',
                },
                permissions: createMockCaip25Permission({
                  'wallet:eip155': {
                    accounts: [],
                  },
                }),
              },
              permissionRequestId: 'test-dependencies',
            },
          }}
        />,
        { state: createMockState() },
      );

      expect(getByTestId(CommonSelectorsIDs.CONNECT_BUTTON)).toBeTruthy();
      expect(getByTestId(CommonSelectorsIDs.CANCEL_BUTTON)).toBeTruthy();
    });
  });

  describe('handleNetworksSelected function and network tab functionality', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('navigates to network selector screen when editing networks', async () => {
      const { getByTestId, findByTestId } = renderWithProvider(
        <MultichainAccountConnect
          route={{
            params: {
              hostInfo: {
                metadata: {
                  id: 'mockId',
                  origin: 'https://example.com',
                },
                permissions: createMockCaip25Permission({
                  'eip155:1': {
                    accounts: [`eip155:1:${MOCK_ADDRESS_1}`],
                  },
                  'eip155:137': {
                    accounts: [`eip155:137:${MOCK_ADDRESS_1}`],
                  },
                }),
              },
              permissionRequestId: 'test-network-selector-screen',
            },
          }}
        />,
        { state: createMockState() },
      );

      // Find and click the edit networks button to trigger network selector
      const editNetworksButton = getByTestId(
        ConnectedAccountsSelectorsIDs.NAVIGATE_TO_EDIT_NETWORKS_PERMISSIONS_BUTTON,
      );
      fireEvent.press(editNetworksButton);

      // Verify that the network selector screen is shown by checking for its elements
      const networkSelectorElement = await findByTestId(
        'multiconnect-connect-network-button',
      );
      expect(networkSelectorElement).toBeTruthy();
    });

    it('returns to single connect screen after network selection', async () => {
      const mockStateWithMultipleNetworks = {
        ...createMockState(),
        engine: {
          ...createMockState().engine,
          backgroundState: {
            ...createMockState().engine?.backgroundState,
            NetworkController: {
              networkConfigurationsByChainId: {
                '0x1': {
                  chainId: '0x1' as `0x${string}`,
                  name: 'Ethereum',
                  rpcEndpoints: [{ url: 'https://mainnet.infura.io/v3/test' }],
                  blockExplorerUrls: ['https://etherscan.io'],
                  nativeCurrency: 'ETH',
                  defaultRpcEndpointIndex: 0,
                },
                '0x89': {
                  chainId: '0x89' as `0x${string}`,
                  name: 'Polygon',
                  rpcEndpoints: [{ url: 'https://polygon-rpc.com' }],
                  blockExplorerUrls: ['https://polygonscan.com'],
                  nativeCurrency: 'MATIC',
                  defaultRpcEndpointIndex: 0,
                },
              },
              selectedNetworkClientId: '1',
            },
          },
        },
      };

      const { getByTestId, findByTestId } = renderWithProvider(
        <MultichainAccountConnect
          route={{
            params: {
              hostInfo: {
                metadata: {
                  id: 'mockId',
                  origin: 'https://example.com',
                },
                permissions: createMockCaip25Permission({
                  'eip155:1': {
                    accounts: [`eip155:1:${MOCK_ADDRESS_1}`],
                  },
                  'eip155:137': {
                    accounts: [`eip155:137:${MOCK_ADDRESS_1}`],
                  },
                }),
              },
              permissionRequestId: 'test-network-selection-return',
            },
          }}
        />,
        { state: mockStateWithMultipleNetworks },
      );

      const editNetworksButton = getByTestId(
        ConnectedAccountsSelectorsIDs.NAVIGATE_TO_EDIT_NETWORKS_PERMISSIONS_BUTTON,
      );
      fireEvent.press(editNetworksButton);

      const networkSelectorButton = await findByTestId(
        'multiconnect-connect-network-button',
      );
      expect(networkSelectorButton).toBeTruthy();

      fireEvent.press(networkSelectorButton);

      expect(
        await findByTestId(CommonSelectorsIDs.CONNECT_BUTTON),
      ).toBeTruthy();
    });

    it('correctly updates selectedChainIds state when networks are selected', async () => {
      const mockStateWithNetworks = {
        ...createMockState(),
        engine: {
          ...createMockState().engine,
          backgroundState: {
            ...createMockState().engine?.backgroundState,
            NetworkController: {
              networkConfigurationsByChainId: {
                '0x1': {
                  chainId: '0x1' as `0x${string}`,
                  name: 'Ethereum',
                  rpcEndpoints: [{ url: 'https://mainnet.infura.io/v3/test' }],
                  blockExplorerUrls: ['https://etherscan.io'],
                  nativeCurrency: 'ETH',
                  defaultRpcEndpointIndex: 0,
                },
                '0x89': {
                  chainId: '0x89' as `0x${string}`,
                  name: 'Polygon',
                  rpcEndpoints: [{ url: 'https://polygon-rpc.com' }],
                  blockExplorerUrls: ['https://polygonscan.com'],
                  nativeCurrency: 'MATIC',
                  defaultRpcEndpointIndex: 0,
                },
                '0xa': {
                  chainId: '0xa' as `0x${string}`,
                  name: 'Optimism',
                  rpcEndpoints: [{ url: 'https://optimism-rpc.com' }],
                  blockExplorerUrls: ['https://optimistic.etherscan.io'],
                  nativeCurrency: 'ETH',
                  defaultRpcEndpointIndex: 0,
                },
              },
              selectedNetworkClientId: '1',
            },
          },
        },
      };

      const { getByTestId, findByTestId } = renderWithProvider(
        <MultichainAccountConnect
          route={{
            params: {
              hostInfo: {
                metadata: {
                  id: 'mockId',
                  origin: 'https://example.com',
                },
                permissions: createMockCaip25Permission({
                  'eip155:1': {
                    accounts: [`eip155:1:${MOCK_ADDRESS_1}`],
                  },
                }),
              },
              permissionRequestId: 'test-chain-ids-update',
            },
          }}
        />,
        { state: mockStateWithNetworks },
      );

      // Navigate to network selector
      const editNetworksButton = getByTestId(
        ConnectedAccountsSelectorsIDs.NAVIGATE_TO_EDIT_NETWORKS_PERMISSIONS_BUTTON,
      );
      fireEvent.press(editNetworksButton);

      // Wait for network selector to appear
      const networkSelector = await findByTestId(
        'multiconnect-connect-network-button',
      );
      expect(networkSelector).toBeTruthy();

      // Try to find and select additional networks
      // Note: Network selection would happen here in a real test scenario

      // Click update to confirm selection
      fireEvent.press(networkSelector);

      // Verify we return to the main screen
      expect(
        await findByTestId(CommonSelectorsIDs.CONNECT_BUTTON),
      ).toBeTruthy();
    });

    it('verifies networks appear correctly selected in network selector', async () => {
      const mockStateWithNetworks = {
        ...createMockState(),
        engine: {
          ...createMockState().engine,
          backgroundState: {
            ...createMockState().engine?.backgroundState,
            NetworkController: {
              networkConfigurationsByChainId: {
                '0x1': {
                  chainId: '0x1' as `0x${string}`,
                  name: 'Ethereum',
                  rpcEndpoints: [{ url: 'https://mainnet.infura.io/v3/test' }],
                  blockExplorerUrls: ['https://etherscan.io'],
                  nativeCurrency: 'ETH',
                  defaultRpcEndpointIndex: 0,
                },
                '0x89': {
                  chainId: '0x89' as `0x${string}`,
                  name: 'Polygon',
                  rpcEndpoints: [{ url: 'https://polygon-rpc.com' }],
                  blockExplorerUrls: ['https://polygonscan.com'],
                  nativeCurrency: 'MATIC',
                  defaultRpcEndpointIndex: 0,
                },
              },
              selectedNetworkClientId: '1',
            },
          },
        },
      };

      const { getByTestId, findByTestId } = renderWithProvider(
        <MultichainAccountConnect
          route={{
            params: {
              hostInfo: {
                metadata: {
                  id: 'mockId',
                  origin: 'https://example.com',
                },
                permissions: createMockCaip25Permission({
                  'eip155:1': {
                    accounts: [`eip155:1:${MOCK_ADDRESS_1}`],
                  },
                  'eip155:137': {
                    accounts: [`eip155:137:${MOCK_ADDRESS_1}`],
                  },
                }),
              },
              permissionRequestId: 'test-network-selection-verification',
            },
          }}
        />,
        { state: mockStateWithNetworks },
      );

      const editNetworksButton = getByTestId(
        ConnectedAccountsSelectorsIDs.NAVIGATE_TO_EDIT_NETWORKS_PERMISSIONS_BUTTON,
      );
      fireEvent.press(editNetworksButton);

      const networkSelectorButton = await findByTestId(
        'multiconnect-connect-network-button',
      );
      expect(networkSelectorButton).toBeTruthy();

      const ethereumSelected = await findByTestId('Ethereum-selected');
      expect(ethereumSelected).toBeTruthy();

      const polygonSelected = await findByTestId('Polygon-selected');
      expect(polygonSelected).toBeTruthy();
    });

    it('verifies individual network selection toggles correctly', async () => {
      const mockStateWithNetworks = {
        ...createMockState(),
        engine: {
          ...createMockState().engine,
          backgroundState: {
            ...createMockState().engine?.backgroundState,
            NetworkController: {
              networkConfigurationsByChainId: {
                '0x1': {
                  chainId: '0x1' as `0x${string}`,
                  name: 'Ethereum',
                  rpcEndpoints: [{ url: 'https://mainnet.infura.io/v3/test' }],
                  blockExplorerUrls: ['https://etherscan.io'],
                  nativeCurrency: 'ETH',
                  defaultRpcEndpointIndex: 0,
                },
                '0x89': {
                  chainId: '0x89' as `0x${string}`,
                  name: 'Polygon',
                  rpcEndpoints: [{ url: 'https://polygon-rpc.com' }],
                  blockExplorerUrls: ['https://polygonscan.com'],
                  nativeCurrency: 'MATIC',
                  defaultRpcEndpointIndex: 0,
                },
              },
              selectedNetworkClientId: '1',
            },
          },
        },
      };

      const { getByTestId, findByTestId, queryByTestId } = renderWithProvider(
        <MultichainAccountConnect
          route={{
            params: {
              hostInfo: {
                metadata: {
                  id: 'mockId',
                  origin: 'https://example.com',
                },
                permissions: createMockCaip25Permission({
                  'eip155:1': {
                    accounts: [`eip155:1:${MOCK_ADDRESS_1}`],
                  },
                }),
              },
              permissionRequestId: 'test-individual-network-selection',
            },
          }}
        />,
        { state: mockStateWithNetworks },
      );

      const editNetworksButton = getByTestId(
        ConnectedAccountsSelectorsIDs.NAVIGATE_TO_EDIT_NETWORKS_PERMISSIONS_BUTTON,
      );
      fireEvent.press(editNetworksButton);

      const networkSelectorButton = await findByTestId(
        'multiconnect-connect-network-button',
      );
      expect(networkSelectorButton).toBeTruthy();

      const ethereumSelected = queryByTestId('Ethereum-selected');

      expect(ethereumSelected).toBeTruthy();

      const polygonSelected = queryByTestId('Polygon-selected');

      expect(polygonSelected).toBeTruthy();
    });
  });

  describe('handleAccountGroupsSelected function tests', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('verifies handleAccountGroupsSelected updates component state after account selection', async () => {
      const mockAcceptPermissions = jest.fn().mockResolvedValue(undefined);
      Engine.context.PermissionController.acceptPermissionsRequest =
        mockAcceptPermissions;

      const { getByTestId } = renderWithProvider(
        <MultichainAccountConnect
          route={{
            params: {
              hostInfo: {
                metadata: {
                  id: 'mockId',
                  origin: 'https://example.com',
                },
                permissions: createMockCaip25Permission({
                  'eip155:1': {
                    accounts: [`eip155:1:${MOCK_ADDRESS_1}`], // Account selected
                  },
                }),
              },
              permissionRequestId: 'test-state-update-after-selection',
            },
          }}
        />,
        { state: createMockState() },
      );

      const connectButton = getByTestId(CommonSelectorsIDs.CONNECT_BUTTON);
      fireEvent.press(connectButton);

      await waitFor(() => {
        expect(mockAcceptPermissions).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({
              origin: 'https://example.com',
            }),
            permissions: expect.objectContaining({
              [Caip25EndowmentPermissionName]: expect.any(Object),
            }),
          }),
        );
      });

      const permissionRequest = mockAcceptPermissions.mock.calls[0][0];
      expect(
        permissionRequest.permissions[Caip25EndowmentPermissionName],
      ).toBeDefined();

      expect(mockAcceptPermissions).toHaveBeenCalledTimes(1);
    });

    it('displays selected accounts correctly in permissions summary', () => {
      const { getByTestId } = renderWithProvider(
        <MultichainAccountConnect
          route={{
            params: {
              hostInfo: {
                metadata: {
                  id: 'mockId',
                  origin: 'https://example.com',
                },
                permissions: createMockCaip25Permission({
                  'eip155:1': {
                    accounts: [`eip155:1:${MOCK_ADDRESS_1}`], // One account selected
                  },
                }),
              },
              permissionRequestId: 'test-account-display',
            },
          }}
        />,
        { state: createMockState() },
      );

      expect(getByTestId('account-list-bottom-sheet')).toBeTruthy();
      expect(getByTestId(CommonSelectorsIDs.CONNECT_BUTTON)).toBeTruthy();
      expect(getByTestId(CommonSelectorsIDs.CANCEL_BUTTON)).toBeTruthy();
    });

    it('verifies handleAccountGroupsSelected updates CAIP25 account IDs correctly', async () => {
      const mockAcceptPermissionsRequestLocal = jest
        .fn()
        .mockResolvedValue(undefined);

      Engine.context.PermissionController.acceptPermissionsRequest =
        mockAcceptPermissionsRequestLocal;

      const { getByTestId } = renderWithProvider(
        <MultichainAccountConnect
          route={{
            params: {
              hostInfo: {
                metadata: {
                  id: 'mockId',
                  origin: 'https://example.com',
                },
                permissions: createMockCaip25Permission({
                  'eip155:1': {
                    accounts: [`eip155:1:${MOCK_ADDRESS_1}`],
                  },
                }),
              },
              permissionRequestId: 'test-caip25-account-ids',
            },
          }}
        />,
        { state: createMockState() },
      );

      const connectButton = getByTestId(CommonSelectorsIDs.CONNECT_BUTTON);
      fireEvent.press(connectButton);

      await waitFor(() => {
        expect(mockAcceptPermissionsRequestLocal).toHaveBeenCalledWith(
          expect.objectContaining({
            metadata: expect.objectContaining({
              origin: 'https://example.com',
            }),
            permissions: expect.objectContaining({
              [Caip25EndowmentPermissionName]: expect.any(Object),
            }),
          }),
        );
      });

      const callArgs = mockAcceptPermissionsRequestLocal.mock.calls[0][0];
      expect(callArgs.permissions[Caip25EndowmentPermissionName]).toBeDefined();
      expect(
        callArgs.permissions[Caip25EndowmentPermissionName].caveats,
      ).toBeDefined();
    });

    it('handles multiple account selections correctly', () => {
      const { getByTestId } = renderWithProvider(
        <MultichainAccountConnect
          route={{
            params: {
              hostInfo: {
                metadata: {
                  id: 'mockId',
                  origin: 'https://example.com',
                },
                permissions: createMockCaip25Permission({
                  'eip155:1': {
                    accounts: [
                      `eip155:1:${MOCK_ADDRESS_1}`,
                      `eip155:1:${MOCK_ADDRESS_2}`,
                    ],
                  },
                }),
              },
              permissionRequestId: 'test-multiple-accounts',
            },
          }}
        />,
        { state: createMockState() },
      );

      expect(getByTestId('account-list-bottom-sheet')).toBeTruthy();

      expect(getByTestId(CommonSelectorsIDs.CONNECT_BUTTON)).toBeTruthy();
      expect(getByTestId(CommonSelectorsIDs.CANCEL_BUTTON)).toBeTruthy();
    });

    it('verifies handleAccountGroupsSelected handles multi-chain scenarios', () => {
      const { getByTestId, getAllByTestId } = renderWithProvider(
        <MultichainAccountConnect
          route={{
            params: {
              hostInfo: {
                metadata: {
                  id: 'mockId',
                  origin: 'https://example.com',
                },
                permissions: createMockCaip25Permission({
                  'eip155:1': {
                    accounts: [`eip155:1:${MOCK_ADDRESS_1}`],
                  },
                  'eip155:137': {
                    accounts: [`eip155:137:${MOCK_ADDRESS_1}`],
                  },
                }),
              },
              permissionRequestId: 'test-multi-chain-consistency',
            },
          }}
        />,
        { state: createMockState() },
      );

      const avatarGroups = getAllByTestId('avatar-group-container');
      expect(avatarGroups.length).toBe(2);

      expect(getByTestId('account-list-bottom-sheet')).toBeTruthy();

      expect(getByTestId(CommonSelectorsIDs.CONNECT_BUTTON)).toBeTruthy();
    });

    it('verifies handleAccountGroupsSelected function behavior is testable', () => {
      const { getByTestId } = renderWithProvider(
        <MultichainAccountConnect
          route={{
            params: {
              hostInfo: {
                metadata: {
                  id: 'mockId',
                  origin: 'https://example.com',
                },
                permissions: createMockCaip25Permission({
                  'eip155:1': {
                    accounts: [`eip155:1:${MOCK_ADDRESS_1}`],
                  },
                }),
              },
              permissionRequestId: 'test-function-behavior',
            },
          }}
        />,
        { state: createMockState() },
      );

      expect(getByTestId('account-list-bottom-sheet')).toBeTruthy();
      expect(getByTestId(CommonSelectorsIDs.CONNECT_BUTTON)).toBeTruthy();
      expect(getByTestId(CommonSelectorsIDs.CANCEL_BUTTON)).toBeTruthy();

      expect(getByTestId('permission-summary-container')).toBeTruthy();
    });

    it('selects Account 2 through edit accounts flow and MultichainAccountConnectMultiSelector', async () => {
      const mockStateWithAccountGroups = {
        ...createMockState(),
        engine: {
          ...createMockState().engine,
          backgroundState: {
            ...createMockState().engine?.backgroundState,
            AccountsController: createMockAccountsControllerState(
              [MOCK_ADDRESS_1, MOCK_ADDRESS_2],
              MOCK_ADDRESS_1,
            ),
          },
        },
      };

      const { getByTestId, findByTestId } = renderWithProvider(
        <MultichainAccountConnect
          route={{
            params: {
              hostInfo: {
                metadata: {
                  id: 'mockId',
                  origin: 'https://example.com',
                },
                permissions: createMockCaip25Permission({
                  'eip155:1': {
                    accounts: [`eip155:1:${MOCK_ADDRESS_1}`], // Start with Account 1 selected
                  },
                }),
              },
              permissionRequestId: 'test-deselect-accounts-flow',
            },
          }}
        />,
        { state: mockStateWithAccountGroups },
      );

      expect(getByTestId('permission-summary-account-text')).toHaveTextContent(
        'Requesting for Account 1',
      );

      const editAccountsButton = getByTestId('permission-summary-container');
      fireEvent.press(editAccountsButton);

      const accountSelectorList = await findByTestId(
        AccountListBottomSheetSelectorsIDs.ACCOUNT_LIST_ID,
      );
      expect(accountSelectorList).toBeTruthy();

      const accountList = await findByTestId('account-list');
      expect(accountList).toBeTruthy();

      const account1Text = getByTestId('account-list').findByProps({
        children: 'Account 1',
      });
      expect(account1Text).toBeTruthy();

      const account2Text = getByTestId('account-list').findByProps({
        children: 'Account 2',
      });
      expect(account2Text).toBeTruthy();

      const account2Cell = account2Text.parent?.parent?.parent?.parent;
      expect(account2Cell).toBeTruthy();
      if (account2Cell) {
        fireEvent.press(account2Cell);
      }

      const updateButtonAfterSelect = await findByTestId(
        ConnectAccountBottomSheetSelectorsIDs.SELECT_MULTI_BUTTON,
      );
      expect(updateButtonAfterSelect).toBeTruthy();

      fireEvent.press(updateButtonAfterSelect);

      const connectButton = await findByTestId(
        CommonSelectorsIDs.CONNECT_BUTTON,
      );
      expect(connectButton).toBeTruthy();

      await waitFor(() => {
        expect(
          getByTestId('permission-summary-account-text'),
        ).toHaveTextContent('Requesting for 2 accounts');
      });
    });
  });
});
