/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, act } from '@testing-library/react-native';
import React from 'react';
import { PredictTabViewSelectorsIDs } from '../../Predict.testIds';

/**
 * Mock Strategy:
 * - Only mock custom feature hooks and child components with complex dependencies
 * - Do NOT mock: Routes, design system, icons, or other internal utilities
 * - Child components are mocked because they have their own test coverage
 * and we're testing the parent's orchestration behavior (error handling, refresh coordination)
 */

// Mock custom Predict hooks
jest.mock('../../hooks/usePredictMeasurement', () => ({
  usePredictMeasurement: jest.fn(),
}));

// Mock child components - they have their own test files and API dependencies
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
  const { View, Text, Pressable } = jest.requireActual('react-native');
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
            <Pressable testID="retry-button" onPress={onRetry}>
              <Text>Retry</Text>
            </Pressable>
          )}
        </View>
      );
    },
  };
});

// Mock ConditionalScrollView - simplifies to ScrollView for testing
jest.mock(
  '../../../../../component-library/components-temp/ConditionalScrollView',
  () => {
    const { ScrollView } = jest.requireActual('react-native');
    const ReactLib = jest.requireActual('react');
    return {
      __esModule: true,
      default: ReactLib.forwardRef(
        (
          {
            children,
            scrollViewProps,
          }: {
            children: React.ReactNode;
            scrollViewProps?: any;
            isScrollEnabled?: boolean;
          },
          ref: any,
        ) => (
          <ScrollView ref={ref} {...scrollViewProps}>
            {children}
          </ScrollView>
        ),
      ),
    };
  },
);

// Mock Redux useSelector to control feature flag and state returns
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const renderWithProviders = (component: React.ReactElement) =>
  render(component);

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

  it('displays account state header component', () => {
    const { getByTestId } = renderWithProviders(<PredictTabView />);

    expect(getByTestId('predict-account-state')).toBeOnTheScreen();
  });

  it('displays positions list component', () => {
    const { getByTestId } = renderWithProviders(<PredictTabView />);

    expect(getByTestId('predict-positions')).toBeOnTheScreen();
  });

  it('displays add funds sheet component', () => {
    const { getByTestId } = renderWithProviders(<PredictTabView />);

    expect(getByTestId('predict-add-funds-sheet')).toBeOnTheScreen();
  });

  it('invokes refresh on account state and positions components when pull-to-refresh executes', async () => {
    isHomepageRedesignEnabled = false;
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
    const mockRefreshFunctions = {
      accountState: jest.fn().mockResolvedValue(undefined),
      positions: jest.fn().mockResolvedValue(undefined),
    };
    const PredictAccountStateMock = jest.requireMock(
      '../../components/PredictPositionsHeader',
    );
    const PredictPositionsMock = jest.requireMock(
      '../../components/PredictPositions/PredictPositions',
    );
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
    const scrollView = getByTestId(PredictTabViewSelectorsIDs.SCROLL_VIEW);
    const refreshControl = scrollView.props.refreshControl;

    await act(async () => {
      await refreshControl.props.onRefresh();
    });

    expect(mockRefreshFunctions.accountState).toHaveBeenCalledTimes(1);
    expect(mockRefreshFunctions.positions).toHaveBeenCalledTimes(1);
  });

  it('sets refreshing state to false before pull-to-refresh executes', async () => {
    isHomepageRedesignEnabled = false;
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
    const scrollView = getByTestId(PredictTabViewSelectorsIDs.SCROLL_VIEW);
    const refreshControl = scrollView.props.refreshControl;

    const initialRefreshingState = refreshControl.props.refreshing;

    expect(initialRefreshingState).toBe(false);
  });

  it('invokes refresh method when pull-to-refresh completes', async () => {
    isHomepageRedesignEnabled = false;
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
    const scrollView = getByTestId(PredictTabViewSelectorsIDs.SCROLL_VIEW);
    const refreshControl = scrollView.props.refreshControl;

    await act(async () => {
      await refreshControl.props.onRefresh();
    });

    expect(mockRefresh).toHaveBeenCalled();
  });

  describe('error handling', () => {
    it('displays error state and hides child components when positions component reports error', () => {
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

      expect(getByTestId('predict-error-state')).toBeOnTheScreen();
      expect(queryByTestId('predict-account-state')).not.toBeOnTheScreen();
      expect(queryByTestId('predict-positions')).not.toBeOnTheScreen();
      expect(queryByTestId('predict-add-funds-sheet')).not.toBeOnTheScreen();
    });

    it('displays error state and hides child components when header component reports error', () => {
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

      expect(getByTestId('predict-error-state')).toBeOnTheScreen();
      expect(queryByTestId('predict-account-state')).not.toBeOnTheScreen();
      expect(queryByTestId('predict-positions')).not.toBeOnTheScreen();
      expect(queryByTestId('predict-add-funds-sheet')).not.toBeOnTheScreen();
    });

    it('displays retry button in error state when positions component reports error', async () => {
      renderWithProviders(<PredictTabView />);
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
      const { rerender, getByTestId } = renderWithProviders(<PredictTabView />);
      rerender(<PredictTabView />);

      act(() => {
        positionsOnError?.('Test error');
      });

      expect(getByTestId('predict-error-state')).toBeOnTheScreen();
      expect(getByTestId('retry-button')).toBeOnTheScreen();
    });

    it('hides account state component when positions onError callback fires', () => {
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

      act(() => {
        capturedOnError?.('Test positions error');
      });

      expect(queryByTestId('predict-account-state')).not.toBeOnTheScreen();
    });

    it('hides account state component when header onError callback fires', () => {
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

      act(() => {
        capturedOnError?.('Test header error');
      });

      expect(queryByTestId('predict-account-state')).not.toBeOnTheScreen();
    });
  });
});
