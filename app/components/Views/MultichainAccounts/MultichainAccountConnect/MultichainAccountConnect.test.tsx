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
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
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
});
