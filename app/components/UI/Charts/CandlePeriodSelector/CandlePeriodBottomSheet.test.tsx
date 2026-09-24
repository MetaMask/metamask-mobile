jest.mock('@metamask/perps-controller', () => {
  const actual = jest.requireActual('@metamask/perps-controller');
  return {
    ...actual,
    getCandlePeriodsForDuration: jest
      .fn()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .mockReturnValue([]) as jest.MockedFunction<any>,
  };
});

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const mockStrings = {
      'perps.chart.candle_intervals': 'Candle intervals',
    };
    return mockStrings[key as keyof typeof mockStrings] || key;
  },
}));

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import configureMockStore from 'redux-mock-store';
import CandlePeriodBottomSheet from './CandlePeriodBottomSheet';
import {
  getCandlePeriodsForDuration,
  CandlePeriod,
  TimeDuration,
} from '@metamask/perps-controller';
import { CandlePeriodBottomSheetSelectorsIDs } from './testIds';

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn(() => ({}));
  return { useTailwind: () => tw };
});

const configureMockStoreValue = configureMockStore();
const mockStore = configureMockStoreValue({
  user: { appTheme: 'light' },
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Provider store={mockStore}>{children}</Provider>
);

describe('CandlePeriodBottomSheet', () => {
  const mockOnClose = jest.fn();
  const mockOnPeriodChange = jest.fn();
  const mockGetCandlePeriodsForDuration =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getCandlePeriodsForDuration as jest.MockedFunction<any>;

  const defaultProps = {
    isVisible: true,
    onClose: mockOnClose,
    selectedPeriod: CandlePeriod.OneHour,
    selectedDuration: TimeDuration.OneDay,
    onPeriodChange: mockOnPeriodChange,
    testID: 'candle-period-bottom-sheet',
  };

  const mockPeriods = [
    { label: '15min', value: CandlePeriod.FifteenMinutes },
    { label: '1h', value: CandlePeriod.OneHour },
    { label: '2h', value: CandlePeriod.TwoHours },
    { label: '4h', value: CandlePeriod.FourHours },
  ] as const;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCandlePeriodsForDuration.mockReturnValue(mockPeriods);
  });

  describe('Rendering', () => {
    it('renders when visible', () => {
      render(
        <TestWrapper>
          <CandlePeriodBottomSheet {...defaultProps} />
        </TestWrapper>,
      );

      expect(
        screen.getByTestId('candle-period-bottom-sheet'),
      ).toBeOnTheScreen();
      expect(screen.getByText('Candle intervals')).toBeOnTheScreen();
    });

    it('does not render when not visible', () => {
      render(
        <TestWrapper>
          <CandlePeriodBottomSheet {...defaultProps} isVisible={false} />
        </TestWrapper>,
      );

      expect(
        screen.queryByTestId('candle-period-bottom-sheet'),
      ).not.toBeOnTheScreen();
    });

    it('renders with custom testID', () => {
      render(
        <TestWrapper>
          <CandlePeriodBottomSheet {...defaultProps} testID="custom-test-id" />
        </TestWrapper>,
      );

      expect(screen.getByTestId('custom-test-id')).toBeOnTheScreen();
    });
  });

  describe('Period Options', () => {
    it('renders all available periods for selected duration', () => {
      render(
        <TestWrapper>
          <CandlePeriodBottomSheet {...defaultProps} />
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
          <CandlePeriodBottomSheet {...defaultProps} />
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
  });

  describe('User Interactions', () => {
    it('calls onPeriodChange when period is selected', () => {
      render(
        <TestWrapper>
          <CandlePeriodBottomSheet {...defaultProps} />
        </TestWrapper>,
      );

      fireEvent.press(screen.getByText('2h'));

      expect(mockOnClose).toHaveBeenCalled();
      expect(mockOnPeriodChange).toHaveBeenCalledWith('2h');
      expect(mockOnClose.mock.invocationCallOrder[0]).toBeLessThan(
        mockOnPeriodChange.mock.invocationCallOrder[0],
      );
    });

    it('calls onClose when header close button is pressed', () => {
      render(
        <TestWrapper>
          <CandlePeriodBottomSheet {...defaultProps} />
        </TestWrapper>,
      );

      fireEvent.press(
        screen.getByTestId(CandlePeriodBottomSheetSelectorsIDs.CLOSE_BUTTON),
      );

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('handles period selection without onPeriodChange callback', () => {
      const { onPeriodChange, ...propsWithoutCallback } = defaultProps;

      render(
        <TestWrapper>
          <CandlePeriodBottomSheet {...propsWithoutCallback} />
        </TestWrapper>,
      );

      expect(() => {
        fireEvent.press(screen.getByText('1h'));
      }).not.toThrow();

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('Analytics hook', () => {
    it('fires onViewed with the selected period when the sheet becomes visible', () => {
      const onViewed = jest.fn();
      const { rerender } = render(
        <TestWrapper>
          <CandlePeriodBottomSheet
            {...defaultProps}
            isVisible={false}
            onViewed={onViewed}
          />
        </TestWrapper>,
      );

      expect(onViewed).not.toHaveBeenCalled();

      rerender(
        <TestWrapper>
          <CandlePeriodBottomSheet {...defaultProps} onViewed={onViewed} />
        </TestWrapper>,
      );

      expect(onViewed).toHaveBeenCalledWith(defaultProps.selectedPeriod);
    });

    it('does not re-fire onViewed when the callback identity changes while visible', () => {
      const first = jest.fn();
      const second = jest.fn();
      const { rerender } = render(
        <TestWrapper>
          <CandlePeriodBottomSheet {...defaultProps} onViewed={first} />
        </TestWrapper>,
      );

      expect(first).toHaveBeenCalledTimes(1);

      rerender(
        <TestWrapper>
          <CandlePeriodBottomSheet {...defaultProps} onViewed={second} />
        </TestWrapper>,
      );

      expect(first).toHaveBeenCalledTimes(1);
      expect(second).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty periods array', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockGetCandlePeriodsForDuration.mockReturnValue([] as any);

      render(
        <TestWrapper>
          <CandlePeriodBottomSheet {...defaultProps} />
        </TestWrapper>,
      );

      expect(
        screen.getByTestId('candle-period-bottom-sheet'),
      ).toBeOnTheScreen();
      expect(screen.getByText('Candle intervals')).toBeOnTheScreen();
    });

    it('handles selectedPeriod not in available periods', () => {
      render(
        <TestWrapper>
          <CandlePeriodBottomSheet
            {...defaultProps}
            selectedPeriod={'invalid-period' as CandlePeriod}
          />
        </TestWrapper>,
      );

      mockPeriods.forEach((period) => {
        expect(screen.getByText(period.label)).toBeOnTheScreen();
      });

      mockPeriods.forEach((period) => {
        expect(
          screen.getByTestId(
            `candle-period-bottom-sheet-period-${period.value}`,
          ),
        ).toBeOnTheScreen();
      });
    });
  });
});
