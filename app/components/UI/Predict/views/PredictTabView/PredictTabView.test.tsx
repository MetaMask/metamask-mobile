import { render, act } from '@testing-library/react-native';
import React, { Ref } from 'react';
import { PredictTabViewSelectorsIDs } from '../../Predict.testIds';
import { PredictHomePositionsHandle } from '../../components/PredictHome/PredictHomePositions';

interface MockPredictHomePositionsProps {
  onError?: (error: string | null) => void;
}

jest.mock('../../hooks/usePredictMeasurement', () => ({
  usePredictMeasurement: jest.fn(),
}));

jest.mock('../../components/PredictHome', () => {
  const ReactLib = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    PredictHomePositions: ReactLib.forwardRef(
      (
        _props: MockPredictHomePositionsProps,
        ref: Ref<PredictHomePositionsHandle>,
      ) => {
        ReactLib.useImperativeHandle(ref, () => ({
          refresh: jest.fn(),
        }));
        return (
          <View testID="predict-home-positions">
            <Text>Home Positions</Text>
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

interface MockScrollViewProps {
  refreshControl?: React.ReactElement;
  testID?: string;
  [key: string]: unknown;
}

interface MockConditionalScrollViewProps {
  children: React.ReactNode;
  scrollViewProps?: MockScrollViewProps;
  isScrollEnabled?: boolean;
}

jest.mock(
  '../../../../../component-library/components-temp/ConditionalScrollView',
  () => {
    const { ScrollView } = jest.requireActual('react-native');
    const ReactLib = jest.requireActual('react');
    return {
      __esModule: true,
      default: ReactLib.forwardRef(
        (
          { children, scrollViewProps }: MockConditionalScrollViewProps,
          ref: Ref<typeof ScrollView>,
        ) => (
          <ScrollView ref={ref} {...scrollViewProps}>
            {children}
          </ScrollView>
        ),
      ),
    };
  },
);

const renderWithProviders = (component: React.ReactElement) =>
  render(component);

import PredictTabView from './PredictTabView';

describe('PredictTabView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  describe('error handling', () => {
    it('displays error state when home positions component reports error', () => {
      const PredictHomeMock = jest.requireMock('../../components/PredictHome');
      PredictHomeMock.PredictHomePositions = React.forwardRef(
        (
          { onError }: MockPredictHomePositionsProps,
          ref: Ref<PredictHomePositionsHandle>,
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
          { onError }: MockPredictHomePositionsProps,
          ref: Ref<PredictHomePositionsHandle>,
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
          { onError }: MockPredictHomePositionsProps,
          ref: Ref<PredictHomePositionsHandle>,
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
