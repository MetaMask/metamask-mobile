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

  return {
    context: {
      PhishingController: {
        maybeUpdateState: jest.fn(),
        test: jest.fn((url: string) => {
          if (url === 'phishing.com') return { result: true };
          return { result: false };
        }),
      },
      PermissionController: {
        rejectPermissionsRequest: jest.fn(),
      },
      AccountsController: {
        state: mockAccountsState,
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
    evmAccounts: [
      {
        address: mockAddress1,
        name: 'Account 1',
      },
      {
        address: mockAddress2,
        name: 'Account 2',
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
  it('renders correctly', () => {
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
                // TODO: Fix this file
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

    // Create a new snapshot since the component UI has changed
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
                eth_accounts: {
                  parentCapability: 'eth_accounts',
                },
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
                eth_accounts: {
                  parentCapability: 'eth_accounts',
                },
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
    it('invokes onPrimaryActionButtonPress property and renders permissions summary', async () => {
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

      // First find and click the edit button on PermissionsSummary to show MultiSelector
      const editButton = getByTestId('permission-summary-container');
      fireEvent.press(editButton);

      // Using UNSAFE_getByType to access onPrimaryActionButtonPress prop directly for coverage
      const multiSelector = UNSAFE_getByType(AccountConnectMultiSelector);

      // Now we can access the component's props
      multiSelector.props.onPrimaryActionButtonPress();

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
});
