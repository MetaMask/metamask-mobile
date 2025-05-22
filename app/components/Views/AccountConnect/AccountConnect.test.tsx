import React from 'react';
import renderWithProvider, {
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import AccountConnect from './AccountConnect';
import { backgroundState } from '../../../util/test/initial-root-state';
import { RootState } from '../../../reducers';
import { fireEvent } from '@testing-library/react-native';
import AccountConnectMultiSelector from './AccountConnectMultiSelector/AccountConnectMultiSelector';
import Engine from '../../../core/Engine';
import {
  createMockAccountsControllerState as createMockAccountsControllerStateUtil,
  MOCK_ADDRESS_1 as mockAddress1,
  MOCK_ADDRESS_2 as mockAddress2,
} from '../../../util/test/accountsControllerTestUtils';
import { PermissionConstraint } from '@metamask/permission-controller';
import {
  Caip25CaveatType,
  Caip25EndowmentPermissionName,
} from '@metamask/chain-agnostic-permission';
import { PermissionSummaryBottomSheetSelectorsIDs } from '../../../../e2e/selectors/Browser/PermissionSummaryBottomSheet.selectors';

const MOCK_ACCOUNTS_CONTROLLER_STATE = createMockAccountsControllerStateUtil([
  mockAddress1,
  mockAddress2,
]);

const mockedNavigate = jest.fn();
const mockedGoBack = jest.fn();
const mockedTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn().mockReturnValue({
  addProperties: jest.fn().mockReturnValue({
    build: jest.fn(),
  }),
});

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
      },
      AccountsController: {
        state: mockAccountsState,
        getAccountByAddress: jest.fn(),
      },
      KeyringController: {
        state: {
          keyrings: [
            {
              type: KeyringTypes.hd,
              accounts: [MOCK_ADDRESS_1, MOCK_ADDRESS_2],
            },
          ],
          keyringsMetadata: [
            {
              id: '01JNG71B7GTWH0J1TSJY9891S0',
              name: '',
            },
          ],
        },
      },
    },
  };
});

const mockRemoveChannel = jest.fn();

// Mock SDKConnect
jest.mock('../../../core/SDKConnect/SDKConnect', () => ({
  getInstance: () => ({
    getConnection: () => undefined,
    removeChannel: mockRemoveChannel,
  }),
}));

// Mock the isUUID function
jest.mock('../../../core/SDKConnect/utils/isUUID', () => ({
  isUUID: () => false,
}));

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
    },
  },
};

describe('AccountConnect', () => {
  it('renders correctly with base request', () => {
    const { toJSON } = renderWithProvider(
      <AccountConnect
        route={{
          params: {
            hostInfo: {
              metadata: {
                id: 'mockId',
                origin: 'mockOrigin',
              },
              permissions: {
                // @ts-expect-error partial object
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
                } as PermissionConstraint,
              },
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
              permissions: {
                // @ts-expect-error partial object
                [Caip25EndowmentPermissionName]: {
                  parentCapability: Caip25EndowmentPermissionName,
                  caveats: [
                    {
                      type: Caip25CaveatType,
                      value: {
                        requiredScopes: {},
                        optionalScopes: {
                          'eip155:1': {
                            accounts: [`eip155:1:${mockAddress1}`],
                          },
                        },
                        isMultichainOrigin: false,
                        sessionProperties: {},
                      },
                    },
                  ],
                } as PermissionConstraint,
              },
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
              permissions: {
                // @ts-expect-error partial object
                [Caip25EndowmentPermissionName]: {
                  parentCapability: Caip25EndowmentPermissionName,
                  caveats: [
                    {
                      type: Caip25CaveatType,
                      value: {
                        requiredScopes: {},
                        optionalScopes: {
                          'eip155:1': {
                            accounts: [],
                          },
                        },
                        isMultichainOrigin: false,
                        sessionProperties: {},
                      },
                    },
                  ],
                } as PermissionConstraint,
              },
            },
            permissionRequestId: 'test',
          },
        }}
      />,
      { state: mockInitialState },
    );

    expect(toJSON()).toMatchSnapshot();
  });

  describe('Renders different screens based on SDK URL status', () => {
    it('should render SingleConnect screen when isSdkUrlUnknown is true', () => {
      const mockPropsForUnknownUrl = {
        route: {
          params: {
            hostInfo: {
              metadata: {
                id: 'mockId',
                // Using an invalid/unknown format for origin
                origin: '',
              },
              permissions: {
                // @ts-expect-error partial object
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
                } as PermissionConstraint,
              },
            },
            permissionRequestId: 'test',
          },
        },
      };

      const { getByTestId } = renderWithProvider(
        <AccountConnect {...mockPropsForUnknownUrl} />,
        { state: mockInitialState },
      );

      expect(getByTestId('connect-account-modal')).toBeDefined();
    });

    it('should render PermissionsSummary screen when isSdkUrlUnknown is false', () => {
      const mockPropsForKnownUrl = {
        route: {
          params: {
            hostInfo: {
              metadata: {
                id: 'mockId',
                // Using a valid URL format
                origin: 'https://example.com',
              },
              permissions: {
                // @ts-expect-error partial object
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
                } as PermissionConstraint,
              },
            },
            permissionRequestId: 'test',
          },
        },
      };

      const { getByTestId } = renderWithProvider(
        <AccountConnect {...mockPropsForKnownUrl} />,
        { state: mockInitialState },
      );

      expect(getByTestId('permission-summary-container')).toBeDefined();
    });
  });

  describe('AccountConnectMultiSelector handlers', () => {
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
                  permissions: {
                    // @ts-expect-error partial object
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
                    } as PermissionConstraint,
                  },
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
              permissions: {
                // @ts-expect-error partial object
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
                } as PermissionConstraint,
              },
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
});
