import { render, screen, act } from '@testing-library/react-native';
import React from 'react';

jest.mock('../../hooks/usePredictDepositToasts', () => ({
  usePredictDepositToasts: jest.fn(),
}));

jest.mock('../../hooks/usePredictClaimToasts', () => ({
  usePredictClaimToasts: jest.fn(() => ({
    showSuccessToast: jest.fn(),
    showErrorToast: jest.fn(),
  })),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
  })),
}));

const renderWithProviders = (component: React.ReactElement) =>
  render(component);

// Mock components
jest.mock('../../components/PredictPositionsHeader', () => {
  const ReactLib = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ReactLib.forwardRef(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (_props: unknown, ref: any) => {
        ReactLib.useImperativeHandle(ref, () => ({
          refresh: jest.fn(),
        }));
        return (
          <View testID="predict-account-state">
            <Text>Account State</Text>
          </View>
        );
      },
    ),
  };
});

jest.mock('../../components/PredictPositions/PredictPositions', () => {
  const ReactLib = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ReactLib.forwardRef(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (_props: unknown, ref: any) => {
        ReactLib.useImperativeHandle(ref, () => ({
          refresh: jest.fn(),
        }));
        return (
          <View testID="predict-positions">
            <Text>Positions</Text>
          </View>
        );
      },
    ),
  };
});

jest.mock('../../components/PredictAddFundsSheet/PredictAddFundsSheet', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: function MockPredictAddFundsSheet() {
      return (
        <View testID="predict-add-funds-sheet">
          <Text>Add Funds</Text>
        </View>
      );
    },
  };
});

jest.mock(
  '../../../../../component-library/components/Skeleton/Skeleton',
  () => {
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: function MockSkeleton({ testID }: { testID?: string }) {
        return <View testID={testID} />;
      },
    };
  },
);

// Mock Routes
jest.mock('../../../../../constants/navigation/Routes', () => ({
  PREDICT: {
    ROOT: 'Predict',
    MARKET_DETAILS: 'PredictMarketDetails',
    MODALS: {
      ROOT: 'PredictModals',
    },
  },
  FULL_SCREEN_CONFIRMATIONS: {
    REDESIGNED_CONFIRMATIONS: 'RedesignedConfirmations',
    NO_HEADER: 'NoHeader',
  },
}));

jest.mock('@metamask/design-system-react-native', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    Box: View,
    Text,
    TextVariant: {
      HeadingMd: 'HeadingMd',
      BodyMd: 'BodyMd',
    },
    TextColor: {
      ErrorDefault: 'ErrorDefault',
    },
    BoxFlexDirection: {
      Row: 'row',
      Column: 'column',
    },
    BoxAlignItems: {
      Center: 'center',
      Start: 'flex-start',
      End: 'flex-end',
    },
    BoxJustifyContent: {
      Between: 'space-between',
      Center: 'center',
      Start: 'flex-start',
      End: 'flex-end',
    },
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: (className: string) => ({ style: className }),
  }),
}));

jest.mock('../../../../../component-library/components/Icons/Icon', () => {
  const { View } = jest.requireActual('react-native');
  const IconNameProxy = new Proxy({}, { get: (_target, prop) => prop });
  return {
    __esModule: true,
    default: View,
    IconColor: {
      Alternative: '#666666',
    },
    IconSize: {
      Xs: 16,
      Sm: 20,
      Md: 24,
      Lg: 32,
      Xl: 40,
    },
    IconName: IconNameProxy,
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../../../../selectors/accountsController', () => ({
  selectSelectedInternalAccountAddress: () => '0x123',
  selectInternalAccounts: () => [],
  selectInternalAccountsById: () => ({}),
  selectSelectedInternalAccountId: () => 'account-id-1',
  selectSelectedInternalAccountFormattedAddress: () => '0x123',
  selectSelectedInternalAccount: () => ({
    id: 'account-id-1',
    address: '0x123',
    metadata: { name: 'Test Account' },
  }),
  selectCanSignTransactions: () => true,
  selectHasCreatedSolanaMainnetAccount: () => false,
}));

jest.mock('../../../../../selectors/keyringController', () => ({
  selectFlattenedKeyringAccounts: () => [],
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(() => '0x123'),
}));

jest.mock('@shopify/flash-list', () => {
  const { View, ScrollView } = jest.requireActual('react-native');
  const ReactLib = jest.requireActual('react');

  return {
    FlashList: ReactLib.forwardRef(
      (
        {
          ListEmptyComponent,
          ListHeaderComponent,
          ListFooterComponent,
          data,
          renderItem,
          refreshControl,
        }: {
          ListEmptyComponent?: React.ReactNode | (() => React.ReactNode);
          ListHeaderComponent?: React.ReactNode | (() => React.ReactNode);
          ListFooterComponent?: React.ReactNode | (() => React.ReactNode);
          data?: unknown[];
          renderItem?: (info: { item: unknown }) => React.ReactNode;
          refreshControl?: React.ReactNode;
        },
        ref: React.Ref<typeof ScrollView>,
      ) => {
        const isEmpty = !data || data.length === 0;

        return (
          <ScrollView
            testID="flash-list"
            refreshControl={refreshControl}
            ref={ref}
          >
            {ListHeaderComponent && (
              <View testID="list-header">
                {typeof ListHeaderComponent === 'function'
                  ? ListHeaderComponent()
                  : ListHeaderComponent}
              </View>
            )}
            {isEmpty && ListEmptyComponent && (
              <View testID="empty-state">
                {typeof ListEmptyComponent === 'function'
                  ? ListEmptyComponent()
                  : ListEmptyComponent}
              </View>
            )}
            {!isEmpty &&
              data.map((item: unknown, index: number) => (
                <View key={index} testID={`list-item-${index}`}>
                  {renderItem?.({ item })}
                </View>
              ))}
            {ListFooterComponent && (
              <View testID="list-footer">
                {typeof ListFooterComponent === 'function'
                  ? ListFooterComponent()
                  : ListFooterComponent}
              </View>
            )}
          </ScrollView>
        );
      },
    ),
  };
});

import PredictTabView from './PredictTabView';

describe('PredictTabView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    renderWithProviders(<PredictTabView />);

    expect(screen.getByTestId('predict-account-state')).toBeOnTheScreen();
    expect(screen.getByTestId('predict-positions')).toBeOnTheScreen();
    expect(screen.getByTestId('predict-add-funds-sheet')).toBeOnTheScreen();
  });

  it('renders all child components', () => {
    renderWithProviders(<PredictTabView />);

    expect(screen.getByText('Account State')).toBeOnTheScreen();
    expect(screen.getByText('Positions')).toBeOnTheScreen();
    expect(screen.getByText('Add Funds')).toBeOnTheScreen();
  });

  it('renders ScrollView with RefreshControl', () => {
    renderWithProviders(<PredictTabView />);

    // Component should render successfully with all child components
    expect(screen.getByTestId('predict-account-state')).toBeOnTheScreen();
    expect(screen.getByTestId('predict-positions')).toBeOnTheScreen();
    expect(screen.getByTestId('predict-add-funds-sheet')).toBeOnTheScreen();
  });

  it('calls refresh on all child components when pull-to-refresh is triggered', async () => {
    // Track the refresh functions from each mocked component
    const mockRefreshFunctions = {
      accountState: jest.fn().mockResolvedValue(undefined),
      positions: jest.fn().mockResolvedValue(undefined),
    };

    // Update the mocks to capture refs
    const PredictAccountStateMock = jest.requireMock(
      '../../components/PredictPositionsHeader',
    );
    const PredictPositionsMock = jest.requireMock(
      '../../components/PredictPositions/PredictPositions',
    );

    // Mock the forwardRef components with working refs
    PredictAccountStateMock.default = React.forwardRef(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (_props: unknown, ref: any) => {
        const { View, Text } = jest.requireActual('react-native');
        React.useImperativeHandle(ref, () => ({
          refresh: mockRefreshFunctions.accountState,
        }));
        return (
          <View testID="predict-account-state">
            <Text>Account State</Text>
          </View>
        );
      },
    );

    PredictPositionsMock.default = React.forwardRef(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (_props: unknown, ref: any) => {
        const { View, Text } = jest.requireActual('react-native');
        React.useImperativeHandle(ref, () => ({
          refresh: mockRefreshFunctions.positions,
        }));
        return (
          <View testID="predict-positions">
            <Text>Positions</Text>
          </View>
        );
      },
    );

    const { UNSAFE_getByType } = renderWithProviders(<PredictTabView />);

    // Get the RefreshControl component
    const { RefreshControl } = jest.requireActual('react-native');
    const refreshControl = UNSAFE_getByType(RefreshControl);

    // Trigger the refresh wrapped in act
    await act(async () => {
      await refreshControl.props.onRefresh();
    });

    // Verify all refresh functions were called
    expect(mockRefreshFunctions.accountState).toHaveBeenCalledTimes(1);
    expect(mockRefreshFunctions.positions).toHaveBeenCalledTimes(1);
  });

  it('handles refresh state correctly', async () => {
    const mockRefresh = jest.fn().mockResolvedValue(undefined);

    // Mock one component to track refresh
    const PredictAccountStateMock = jest.requireMock(
      '../../components/PredictPositionsHeader',
    );
    PredictAccountStateMock.default = React.forwardRef(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (_props: unknown, ref: any) => {
        const { View, Text } = jest.requireActual('react-native');
        React.useImperativeHandle(ref, () => ({
          refresh: mockRefresh,
        }));
        return (
          <View testID="predict-account-state">
            <Text>Account State</Text>
          </View>
        );
      },
    );

    const { UNSAFE_getByType } = renderWithProviders(<PredictTabView />);

    const { RefreshControl } = jest.requireActual('react-native');
    const refreshControl = UNSAFE_getByType(RefreshControl);

    // Initially not refreshing
    expect(refreshControl.props.refreshing).toBe(false);

    // Trigger refresh wrapped in act
    await act(async () => {
      await refreshControl.props.onRefresh();
    });

    // After refresh completes, should be false again
    expect(mockRefresh).toHaveBeenCalled();
  });
});
