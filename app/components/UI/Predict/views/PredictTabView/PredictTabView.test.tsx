/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, act } from '@testing-library/react-native';
import React from 'react';
import { PredictTabViewSelectorsIDs } from '../../Predict.testIds';

jest.mock('../../hooks/usePredictDepositToasts', () => ({
  usePredictDepositToasts: jest.fn(),
}));

jest.mock('../../hooks/usePredictClaimToasts', () => ({
  usePredictClaimToasts: jest.fn(),
}));

jest.mock('../../hooks/usePredictWithdrawToasts', () => ({
  usePredictWithdrawToasts: jest.fn(),
}));

jest.mock('../../hooks/usePredictMeasurement', () => ({
  usePredictMeasurement: jest.fn(),
}));

jest.mock('../../components/PredictHome', () => {
  const ReactLib = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    PredictHomePositions: ReactLib.forwardRef((_props: unknown, ref: any) => {
      ReactLib.useImperativeHandle(ref, () => ({
        refresh: jest.fn(),
      }));
      return (
        <View testID="predict-home-positions">
          <Text>Home Positions</Text>
        </View>
      );
    }),
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

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

const renderWithProviders = (component: React.ReactElement) =>
  render(component);

import PredictTabView from './PredictTabView';
import { useSelector } from 'react-redux';

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

let isHomepageRedesignEnabled = true;

describe('PredictTabView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isHomepageRedesignEnabled = true;
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('displays home positions component', () => {
    const { getByTestId } = renderWithProviders(<PredictTabView />);

    expect(getByTestId('predict-home-positions')).toBeOnTheScreen();
  });

  it('displays add funds sheet component', () => {
    const { getByTestId } = renderWithProviders(<PredictTabView />);

    expect(getByTestId('predict-add-funds-sheet')).toBeOnTheScreen();
  });

  it('invokes refresh on home positions component when pull-to-refresh executes', async () => {
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
    const PredictHomeMock = jest.requireMock('../../components/PredictHome');
    PredictHomeMock.PredictHomePositions = React.forwardRef(
      (_props: unknown, ref: any) => {
        const { View, Text } = jest.requireActual('react-native');
        React.useImperativeHandle(ref, () => ({
          refresh: mockRefresh,
        }));
        return (
          <View testID="predict-home-positions">
            <Text>Home Positions</Text>
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

    expect(mockRefresh).toHaveBeenCalledTimes(1);
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
    const { getByTestId } = renderWithProviders(<PredictTabView />);
    const scrollView = getByTestId(PredictTabViewSelectorsIDs.SCROLL_VIEW);
    const refreshControl = scrollView.props.refreshControl;

    const initialRefreshingState = refreshControl.props.refreshing;

    expect(initialRefreshingState).toBe(false);
  });

  describe('error handling', () => {
    it('displays error state when home positions component reports error', () => {
      const PredictHomeMock = jest.requireMock('../../components/PredictHome');
      PredictHomeMock.PredictHomePositions = React.forwardRef(
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
            <View testID="predict-home-positions">
              <Text>Home Positions</Text>
            </View>
          );
        },
      );

      const { getByTestId, queryByTestId } = renderWithProviders(
        <PredictTabView />,
      );

      expect(getByTestId('predict-error-state')).toBeOnTheScreen();
      expect(queryByTestId('predict-home-positions')).not.toBeOnTheScreen();
      expect(queryByTestId('predict-add-funds-sheet')).not.toBeOnTheScreen();
    });

    it('displays retry button in error state', async () => {
      const PredictHomeMock = jest.requireMock('../../components/PredictHome');
      let capturedOnError: ((error: string | null) => void) | undefined;
      PredictHomeMock.PredictHomePositions = React.forwardRef(
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
            <View testID="predict-home-positions">
              <Text>Home Positions</Text>
            </View>
          );
        },
      );
      const { rerender, getByTestId } = renderWithProviders(<PredictTabView />);
      rerender(<PredictTabView />);

      act(() => {
        capturedOnError?.('Test error');
      });

      expect(getByTestId('predict-error-state')).toBeOnTheScreen();
      expect(getByTestId('retry-button')).toBeOnTheScreen();
    });

    it('hides home positions component when onError callback fires', () => {
      const PredictHomeMock = jest.requireMock('../../components/PredictHome');
      let capturedOnError: ((error: string | null) => void) | undefined;
      PredictHomeMock.PredictHomePositions = React.forwardRef(
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
            <View testID="predict-home-positions">
              <Text>Home Positions</Text>
            </View>
          );
        },
      );
      const { queryByTestId } = renderWithProviders(<PredictTabView />);

      act(() => {
        capturedOnError?.('Test error');
      });

      expect(queryByTestId('predict-home-positions')).not.toBeOnTheScreen();
    });
  });
});
