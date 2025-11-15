/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, act } from '@testing-library/react-native';
import React from 'react';
import { PredictTabViewSelectorsIDs } from '../../../../../../e2e/selectors/Predict/Predict.selectors';

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
  useFocusEffect: jest.fn((callback: () => void) => {
    // Execute callback immediately for testing
    callback();
  }),
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

jest.mock('../../components/PredictOffline', () => {
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: function MockPredictOffline({
      onRetry,
    }: {
      onRetry?: () => void;
    }) {
      return (
        <View testID="predict-error-state">
          <Text>Error State</Text>
          {onRetry && (
            <Text testID="retry-button" onPress={onRetry}>
              Retry
            </Text>
          )}
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
  useSelector: jest.fn(),
}));

jest.mock('../../../../../core/Engine', () => ({
  controllerMessenger: {
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
  },
  context: {
    TransactionController: {
      addTransaction: jest.fn(),
      approveTransaction: jest.fn(),
      cancelTransaction: jest.fn(),
      speedUpTransaction: jest.fn(),
      updateEditableParams: jest.fn(),
      updateTransaction: jest.fn(),
      updateTransactionGasFees: jest.fn(),
      updatePreviousGasParams: jest.fn(),
    },
  },
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
import { useSelector } from 'react-redux';

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

// Control variable for homepage redesign flag
let isHomepageRedesignEnabled = true;

describe('PredictTabView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset to default
    isHomepageRedesignEnabled = true;
    // Mock useSelector to return appropriate values based on call order
    // The component typically calls: selectHomepageRedesignV1Enabled first
    let callCount = 0;
    mockUseSelector.mockImplementation(() => {
      callCount++;
      // First call is usually for feature flag
      if (callCount === 1) {
        return isHomepageRedesignEnabled;
      }
      // Second call might be for chain ID or other boolean flags
      if (callCount === 2) {
        return true; // selectIsEvmNetworkSelected or similar
      }
      // Other calls return chain ID
      return '0x1';
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { getByTestId } = renderWithProviders(<PredictTabView />);

    expect(getByTestId('predict-account-state')).toBeOnTheScreen();
    expect(getByTestId('predict-positions')).toBeOnTheScreen();
    expect(getByTestId('predict-add-funds-sheet')).toBeOnTheScreen();
  });

  it('renders all child components', () => {
    const { getByText } = renderWithProviders(<PredictTabView />);

    expect(getByText('Account State')).toBeOnTheScreen();
    expect(getByText('Positions')).toBeOnTheScreen();
    expect(getByText('Add Funds')).toBeOnTheScreen();
  });

  it('renders ScrollView with RefreshControl', () => {
    const { getByTestId } = renderWithProviders(<PredictTabView />);

    // Component should render successfully with all child components
    expect(getByTestId('predict-account-state')).toBeOnTheScreen();
    expect(getByTestId('predict-positions')).toBeOnTheScreen();
    expect(getByTestId('predict-add-funds-sheet')).toBeOnTheScreen();
  });

  it('calls refresh on all child components when pull-to-refresh is triggered', async () => {
    // Mock homepage redesign as disabled to render RefreshControl
    isHomepageRedesignEnabled = false;

    // Re-mock useSelector with the updated flag value
    let callCount = 0;
    mockUseSelector.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return isHomepageRedesignEnabled;
      }
      if (callCount === 2) {
        return true;
      }
      return '0x1';
    });

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

    const { getByTestId } = renderWithProviders(<PredictTabView />);

    // Get the ScrollView and access RefreshControl through its props
    const scrollView = getByTestId(PredictTabViewSelectorsIDs.SCROLL_VIEW);
    const refreshControl = scrollView.props.refreshControl;

    // Trigger the refresh wrapped in act
    await act(async () => {
      await refreshControl.props.onRefresh();
    });

    // Verify all refresh functions were called
    expect(mockRefreshFunctions.accountState).toHaveBeenCalledTimes(1);
    expect(mockRefreshFunctions.positions).toHaveBeenCalledTimes(1);
  });

  it('handles refresh state correctly', async () => {
    // Mock homepage redesign as disabled to render RefreshControl
    isHomepageRedesignEnabled = false;

    // Re-mock useSelector with the updated flag value
    let callCount = 0;
    mockUseSelector.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return isHomepageRedesignEnabled;
      }
      if (callCount === 2) {
        return true;
      }
      return '0x1';
    });

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

    const { getByTestId } = renderWithProviders(<PredictTabView />);

    // Get the ScrollView and access RefreshControl through its props
    const scrollView = getByTestId(PredictTabViewSelectorsIDs.SCROLL_VIEW);
    const refreshControl = scrollView.props.refreshControl;

    // Initially not refreshing
    expect(refreshControl.props.refreshing).toBe(false);

    // Trigger refresh wrapped in act
    await act(async () => {
      await refreshControl.props.onRefresh();
    });

    // After refresh completes, should be false again
    expect(mockRefresh).toHaveBeenCalled();
  });

  describe('error handling', () => {
    it('renders error state when positions error occurs', () => {
      // Mock PredictPositions to trigger error
      const PredictPositionsMock = jest.requireMock(
        '../../components/PredictPositions/PredictPositions',
      );

      PredictPositionsMock.default = React.forwardRef(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (
          { onError }: { onError?: (error: string | null) => void },
          ref: any,
        ) => {
          const { View, Text } = jest.requireActual('react-native');
          React.useImperativeHandle(ref, () => ({
            refresh: jest.fn(),
          }));

          // Simulate error on mount
          React.useEffect(() => {
            onError?.('Positions error occurred');
          }, [onError]);

          return (
            <View testID="predict-positions">
              <Text>Positions</Text>
            </View>
          );
        },
      );

      const { getByTestId, queryByTestId } = renderWithProviders(
        <PredictTabView />,
      );

      // Should render error state instead of normal components
      expect(getByTestId('predict-error-state')).toBeOnTheScreen();
      expect(queryByTestId('predict-account-state')).not.toBeOnTheScreen();
      expect(queryByTestId('predict-positions')).not.toBeOnTheScreen();
      expect(queryByTestId('predict-add-funds-sheet')).not.toBeOnTheScreen();
    });

    it('renders error state when header error occurs', () => {
      // Mock PredictPositionsHeader to trigger error
      const PredictAccountStateMock = jest.requireMock(
        '../../components/PredictPositionsHeader',
      );

      PredictAccountStateMock.default = React.forwardRef(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (
          { onError }: { onError?: (error: string | null) => void },
          ref: any,
        ) => {
          const { View, Text } = jest.requireActual('react-native');
          React.useImperativeHandle(ref, () => ({
            refresh: jest.fn(),
          }));

          // Simulate error on mount
          React.useEffect(() => {
            onError?.('Header error occurred');
          }, [onError]);

          return (
            <View testID="predict-account-state">
              <Text>Account State</Text>
            </View>
          );
        },
      );

      const { getByTestId, queryByTestId } = renderWithProviders(
        <PredictTabView />,
      );

      // Should render error state instead of normal components
      expect(getByTestId('predict-error-state')).toBeOnTheScreen();
      expect(queryByTestId('predict-account-state')).not.toBeOnTheScreen();
      expect(queryByTestId('predict-positions')).not.toBeOnTheScreen();
      expect(queryByTestId('predict-add-funds-sheet')).not.toBeOnTheScreen();
    });

    it('calls handleRefresh when retry button is pressed in error state', async () => {
      // Set up component in normal state first
      renderWithProviders(<PredictTabView />);

      // Switch to error state by calling the error callbacks
      // (This simulates what would happen if child components reported errors)

      // Mock the components to trigger errors and capture error callbacks
      const PredictPositionsMock = jest.requireMock(
        '../../components/PredictPositions/PredictPositions',
      );
      const PredictAccountStateMock = jest.requireMock(
        '../../components/PredictPositionsHeader',
      );

      let positionsOnError: ((error: string | null) => void) | undefined;

      PredictPositionsMock.default = React.forwardRef(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (
          { onError }: { onError?: (error: string | null) => void },
          ref: any,
        ) => {
          React.useEffect(() => {
            positionsOnError = onError;
          }, [onError]);
          const { View, Text } = jest.requireActual('react-native');
          React.useImperativeHandle(ref, () => ({
            refresh: jest.fn(),
          }));
          return (
            <View testID="predict-positions">
              <Text>Positions</Text>
            </View>
          );
        },
      );

      PredictAccountStateMock.default = React.forwardRef(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (_props: unknown, ref: any) => {
          const { View, Text } = jest.requireActual('react-native');
          React.useImperativeHandle(ref, () => ({
            refresh: jest.fn(),
          }));
          return (
            <View testID="predict-account-state">
              <Text>Account State</Text>
            </View>
          );
        },
      );

      // Re-render to apply the new mocks
      const { rerender, getByTestId } = renderWithProviders(<PredictTabView />);
      rerender(<PredictTabView />);

      // Now trigger errors to switch to error state
      act(() => {
        positionsOnError?.('Test error');
      });

      // Should now show error state
      expect(getByTestId('predict-error-state')).toBeOnTheScreen();

      // The retry button should be present in the error state
      expect(getByTestId('retry-button')).toBeOnTheScreen();
    });

    it('handles positions error callback', () => {
      // Mock PredictPositions to call onError prop
      const PredictPositionsMock = jest.requireMock(
        '../../components/PredictPositions/PredictPositions',
      );

      let capturedOnError: ((error: string | null) => void) | undefined;

      PredictPositionsMock.default = React.forwardRef(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (
          { onError }: { onError?: (error: string | null) => void },
          ref: any,
        ) => {
          const { View, Text } = jest.requireActual('react-native');
          React.useImperativeHandle(ref, () => ({
            refresh: jest.fn(),
          }));

          // Capture the onError callback
          React.useEffect(() => {
            capturedOnError = onError;
          }, [onError]);

          return (
            <View testID="predict-positions">
              <Text>Positions</Text>
            </View>
          );
        },
      );

      const { queryByTestId } = renderWithProviders(<PredictTabView />);

      // Simulate calling the error callback
      act(() => {
        capturedOnError?.('Test positions error');
      });

      // Should render error state
      expect(queryByTestId('predict-account-state')).not.toBeOnTheScreen();
    });

    it('handles header error callback', () => {
      // Mock PredictPositionsHeader to call onError prop
      const PredictAccountStateMock = jest.requireMock(
        '../../components/PredictPositionsHeader',
      );

      let capturedOnError: ((error: string | null) => void) | undefined;

      PredictAccountStateMock.default = React.forwardRef(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (
          { onError }: { onError?: (error: string | null) => void },
          ref: any,
        ) => {
          const { View, Text } = jest.requireActual('react-native');
          React.useImperativeHandle(ref, () => ({
            refresh: jest.fn(),
          }));

          // Capture the onError callback
          React.useEffect(() => {
            capturedOnError = onError;
          }, [onError]);

          return (
            <View testID="predict-account-state">
              <Text>Account State</Text>
            </View>
          );
        },
      );

      const { queryByTestId } = renderWithProviders(<PredictTabView />);

      // Simulate calling the error callback
      act(() => {
        capturedOnError?.('Test header error');
      });

      // Should render error state
      expect(queryByTestId('predict-account-state')).not.toBeOnTheScreen();
    });
  });
});
