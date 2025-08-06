// Mock the constants
jest.mock('../../constants/chartConfig', () => {
  const actual = jest.requireActual('../../constants/chartConfig');
  return {
    ...actual,
    getCandlePeriodsForDuration: jest
      .fn()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue([]) as jest.MockedFunction<any>,
  };
});

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import PerpsCandlePeriodBottomSheet from './PerpsCandlePeriodBottomSheet';
import {
  getCandlePeriodsForDuration,
  CandlePeriod,
  TimeDuration,
} from '../../constants/chartConfig';

// Mock react-native-safe-area-context first
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  }),
}));

// Mock BottomSheet components
jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const { forwardRef } = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    const BottomSheet = forwardRef(
      (
        { children, testID }: { children: React.ReactNode; testID?: string },
        _ref: unknown,
      ) => <View testID={testID || 'bottom-sheet'}>{children}</View>,
    );
    BottomSheet.displayName = 'BottomSheet';
    return {
      __esModule: true,
      default: BottomSheet,
    };
  },
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    const { View } = jest.requireActual('react-native');
    return jest.fn(
      ({
        children,
        onClose,
      }: {
        children: React.ReactNode;
        onClose?: () => void;
      }) => (
        <View testID="bottom-sheet-header">
          {children}
          <View testID="close-button" onTouchEnd={onClose} />
        </View>
      ),
    );
  },
);

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      container: {},
      periodOption: {},
      periodOptionActive: {},
      periodText: {},
      periodTextActive: {},
      checkIcon: {},
      periodOptionLast: {},
    },
  }),
  useComponentSize: () => ({
    size: { width: 0, height: 0 },
    onLayout: jest.fn(),
  }),
}));

// Create mock store
const configureMockStoreValue = configureMockStore();
const mockStore = configureMockStoreValue({
  user: { appTheme: 'light' },
});

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Provider store={mockStore}>{children}</Provider>
);

describe('PerpsCandlePeriodBottomSheet', () => {
  const mockOnClose = jest.fn();
  const mockOnPeriodChange = jest.fn();
  const mockGetCandlePeriodsForDuration =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getCandlePeriodsForDuration as jest.MockedFunction<any>;

  const defaultProps = {
    isVisible: true,
    onClose: mockOnClose,
    selectedPeriod: CandlePeriod.ONE_HOUR,
    selectedDuration: TimeDuration.ONE_DAY,
    onPeriodChange: mockOnPeriodChange,
    testID: 'candle-period-bottom-sheet',
  };

  const mockPeriods = [
    { label: '15min', value: CandlePeriod.FIFTEEN_MINUTES },
    { label: '1h', value: CandlePeriod.ONE_HOUR },
    { label: '2h', value: CandlePeriod.TWO_HOURS },
    { label: '4h', value: CandlePeriod.FOUR_HOURS },
  ] as const;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCandlePeriodsForDuration.mockReturnValue(mockPeriods);
  });

  describe('Rendering', () => {
    it('renders when visible', () => {
      render(
        <TestWrapper>
          <PerpsCandlePeriodBottomSheet {...defaultProps} />
        </TestWrapper>,
      );

      expect(
        screen.getByTestId('candle-period-bottom-sheet'),
      ).toBeOnTheScreen();
      expect(screen.getByTestId('bottom-sheet-header')).toBeOnTheScreen();
      expect(screen.getByText('Select Candle Period')).toBeOnTheScreen();
    });

    it('does not render when not visible', () => {
      render(
        <TestWrapper>
          <PerpsCandlePeriodBottomSheet {...defaultProps} isVisible={false} />
        </TestWrapper>,
      );

      expect(
        screen.queryByTestId('candle-period-bottom-sheet'),
      ).not.toBeOnTheScreen();
    });

    it('renders with custom testID', () => {
      render(
        <TestWrapper>
          <PerpsCandlePeriodBottomSheet
            {...defaultProps}
            testID="custom-test-id"
          />
        </TestWrapper>,
      );

      expect(screen.getByTestId('custom-test-id')).toBeOnTheScreen();
    });

    it('renders without testID gracefully', () => {
      const { testID, ...propsWithoutTestID } = defaultProps;
      render(
        <TestWrapper>
          <PerpsCandlePeriodBottomSheet {...propsWithoutTestID} />
        </TestWrapper>,
      );

      // Should render content even without testID
      expect(screen.getByText('Select Candle Period')).toBeOnTheScreen();
    });
  });

  describe('Period Options', () => {
    it('renders all available periods for selected duration', () => {
      render(
        <TestWrapper>
          <PerpsCandlePeriodBottomSheet {...defaultProps} />
        </TestWrapper>,
      );

      expect(mockGetCandlePeriodsForDuration).toHaveBeenCalledWith('1d');

      mockPeriods.forEach((period) => {
        expect(screen.getByText(period.label)).toBeOnTheScreen();
      });
    });

    it('renders periods with correct testIDs', () => {
      render(
        <TestWrapper>
          <PerpsCandlePeriodBottomSheet {...defaultProps} />
        </TestWrapper>,
      );

      mockPeriods.forEach((period) => {
        expect(
          screen.getByTestId(
            `candle-period-bottom-sheet-period-${period.value}`,
          ),
        ).toBeOnTheScreen();
      });
    });

    it('highlights selected period', () => {
      render(
        <TestWrapper>
          <PerpsCandlePeriodBottomSheet
            {...defaultProps}
            selectedPeriod={CandlePeriod.TWO_HOURS}
          />
        </TestWrapper>,
      );

      // Check icon should be visible for selected period
      const selectedPeriodOption = screen.getByTestId(
        'candle-period-bottom-sheet-period-2h',
      );
      expect(selectedPeriodOption).toBeOnTheScreen();
    });

    it('shows check icon only for selected period', () => {
      render(
        <TestWrapper>
          <PerpsCandlePeriodBottomSheet
            {...defaultProps}
            selectedPeriod={CandlePeriod.ONE_HOUR}
          />
        </TestWrapper>,
      );

      // Selected period should have two children (Text + SvgMock)
      const selectedPeriod = screen.getByTestId(
        'candle-period-bottom-sheet-period-1h',
      );
      expect(selectedPeriod.children).toHaveLength(2);

      // Unselected periods should have only one child (just Text)
      const unselectedPeriod = screen.getByTestId(
        'candle-period-bottom-sheet-period-2h',
      );
      expect(unselectedPeriod.children).toHaveLength(1);
    });

    it('updates periods when selectedDuration changes', () => {
      const { rerender } = render(
        <TestWrapper>
          <PerpsCandlePeriodBottomSheet
            {...defaultProps}
            selectedDuration={TimeDuration.ONE_WEEK}
          />
        </TestWrapper>,
      );

      expect(mockGetCandlePeriodsForDuration).toHaveBeenCalledWith(
        TimeDuration.ONE_WEEK,
      );

      // Mock different periods for new duration
      const newMockPeriods = [
        { label: '1h', value: CandlePeriod.ONE_HOUR },
        { label: '4h', value: CandlePeriod.FOUR_HOURS },
        { label: '1D', value: CandlePeriod.ONE_DAY },
      ];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockGetCandlePeriodsForDuration.mockReturnValue(newMockPeriods as any);

      rerender(
        <TestWrapper>
          <PerpsCandlePeriodBottomSheet
            {...defaultProps}
            selectedDuration={TimeDuration.ONE_DAY}
          />
        </TestWrapper>,
      );

      expect(mockGetCandlePeriodsForDuration).toHaveBeenCalledWith(
        TimeDuration.ONE_DAY,
      );
    });
  });

  describe('User Interactions', () => {
    it('calls onPeriodChange when period is selected', () => {
      render(
        <TestWrapper>
          <PerpsCandlePeriodBottomSheet {...defaultProps} />
        </TestWrapper>,
      );

      fireEvent.press(screen.getByText('2h'));

      expect(mockOnPeriodChange).toHaveBeenCalledWith('2h');
    });

    it('calls onClose after period selection', () => {
      render(
        <TestWrapper>
          <PerpsCandlePeriodBottomSheet {...defaultProps} />
        </TestWrapper>,
      );

      fireEvent.press(screen.getByText('15min'));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when header close button is pressed', () => {
      render(
        <TestWrapper>
          <PerpsCandlePeriodBottomSheet {...defaultProps} />
        </TestWrapper>,
      );

      fireEvent(screen.getByTestId('close-button'), 'touchEnd');

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('handles period selection without onPeriodChange callback', () => {
      const { onPeriodChange, ...propsWithoutCallback } = defaultProps;

      render(
        <TestWrapper>
          <PerpsCandlePeriodBottomSheet {...propsWithoutCallback} />
        </TestWrapper>,
      );

      expect(() => {
        fireEvent.press(screen.getByText('1h'));
      }).not.toThrow();

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty periods array', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockGetCandlePeriodsForDuration.mockReturnValue([] as any);

      render(
        <TestWrapper>
          <PerpsCandlePeriodBottomSheet {...defaultProps} />
        </TestWrapper>,
      );

      expect(
        screen.getByTestId('candle-period-bottom-sheet'),
      ).toBeOnTheScreen();
      expect(screen.getByText('Select Candle Period')).toBeOnTheScreen();
    });

    it('handles selectedPeriod not in available periods', () => {
      render(
        <TestWrapper>
          <PerpsCandlePeriodBottomSheet
            {...defaultProps}
            selectedPeriod={'invalid-period' as CandlePeriod}
          />
        </TestWrapper>,
      );

      // Should still render all periods
      mockPeriods.forEach((period) => {
        expect(screen.getByText(period.label)).toBeOnTheScreen();
      });

      // No check icon should be visible since selected period is invalid
      // All periods should have only one child (just Text, no SvgMock)
      mockPeriods.forEach((period) => {
        const periodElement = screen.getByTestId(
          `candle-period-bottom-sheet-period-${period.value}`,
        );
        expect(periodElement.children).toHaveLength(1);
      });
    });

    it('handles undefined selectedDuration', () => {
      render(
        <TestWrapper>
          <PerpsCandlePeriodBottomSheet
            {...defaultProps}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            selectedDuration={undefined as any}
          />
        </TestWrapper>,
      );

      expect(mockGetCandlePeriodsForDuration).toHaveBeenCalledWith(undefined);
      expect(
        screen.getByTestId('candle-period-bottom-sheet'),
      ).toBeOnTheScreen();
    });
  });

  describe('Component Lifecycle', () => {
    it('calls bottomSheetRef.onOpenBottomSheet when visible becomes true', () => {
      const { rerender } = render(
        <TestWrapper>
          <PerpsCandlePeriodBottomSheet {...defaultProps} isVisible={false} />
        </TestWrapper>,
      );

      // Initially not visible, so bottom sheet shouldn't be shown
      expect(
        screen.queryByTestId('candle-period-bottom-sheet'),
      ).not.toBeOnTheScreen();

      // Make visible
      rerender(
        <TestWrapper>
          <PerpsCandlePeriodBottomSheet {...defaultProps} isVisible />
        </TestWrapper>,
      );

      expect(
        screen.getByTestId('candle-period-bottom-sheet'),
      ).toBeOnTheScreen();
    });
  });

  describe('Different Duration Scenarios', () => {
    const durationTestCases = [
      {
        duration: TimeDuration.ONE_HOUR,
        expectedPeriods: [
          { label: '3min', value: CandlePeriod.THREE_MINUTES },
          { label: '5min', value: CandlePeriod.FIVE_MINUTES },
          { label: '15min', value: CandlePeriod.FIFTEEN_MINUTES },
        ] as const,
      },
      {
        duration: TimeDuration.ONE_WEEK,
        expectedPeriods: [
          { label: '1h', value: CandlePeriod.ONE_HOUR },
          { label: '4h', value: CandlePeriod.FOUR_HOURS },
          { label: '1D', value: CandlePeriod.ONE_DAY },
        ] as const,
      },
      {
        duration: TimeDuration.ONE_DAY,
        expectedPeriods: [
          { label: '8h', value: CandlePeriod.EIGHT_HOURS },
          { label: '1D', value: CandlePeriod.ONE_DAY },
          { label: '1W', value: CandlePeriod.ONE_WEEK },
        ] as const,
      },
    ] as const;

    durationTestCases.forEach(({ duration, expectedPeriods }) => {
      it(`renders correct periods for ${duration} duration`, () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mockGetCandlePeriodsForDuration.mockReturnValue(expectedPeriods as any);

        render(
          <TestWrapper>
            <PerpsCandlePeriodBottomSheet
              {...defaultProps}
              selectedDuration={duration}
            />
          </TestWrapper>,
        );

        expect(mockGetCandlePeriodsForDuration).toHaveBeenCalledWith(duration);

        expectedPeriods.forEach((period) => {
          expect(screen.getByText(period.label)).toBeOnTheScreen();
        });
      });
    });
  });

  describe('Accessibility', () => {
    it('renders with proper component structure for screen readers', () => {
      render(
        <TestWrapper>
          <PerpsCandlePeriodBottomSheet {...defaultProps} />
        </TestWrapper>,
      );

      expect(screen.getByText('Select Candle Period')).toBeOnTheScreen();

      mockPeriods.forEach((period) => {
        const periodButton = screen.getByTestId(
          `candle-period-bottom-sheet-period-${period.value}`,
        );
        expect(periodButton).toBeOnTheScreen();
      });
    });
  });
});
