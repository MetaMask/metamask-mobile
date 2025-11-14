import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import ChartLegend from './ChartLegend';
import { ChartSeries } from '../PredictDetailsChart';

jest.mock('../utils', () => ({
  formatTickValue: jest.fn((value: number, range: number) => {
    if (!Number.isFinite(value)) {
      return '0';
    }
    if (range < 1) {
      return value.toFixed(2);
    }
    if (range < 10) {
      return value.toFixed(1);
    }
    return value.toFixed(0);
  }),
}));

describe('ChartLegend', () => {
  const mockSingleSeries: ChartSeries[] = [
    {
      label: 'Outcome A',
      color: '#4459FF',
      data: [
        { timestamp: 1640995200000, value: 0.5 },
        { timestamp: 1640998800000, value: 0.6 },
        { timestamp: 1641002400000, value: 0.75 },
      ],
    },
  ];

  const mockMultipleSeries: ChartSeries[] = [
    {
      label: 'Outcome A',
      color: '#4459FF',
      data: [
        { timestamp: 1640995200000, value: 0.5 },
        { timestamp: 1640998800000, value: 0.6 },
        { timestamp: 1641002400000, value: 0.75 },
      ],
    },
    {
      label: 'Outcome B',
      color: '#FF6B6B',
      data: [
        { timestamp: 1640995200000, value: 0.3 },
        { timestamp: 1640998800000, value: 0.2 },
        { timestamp: 1641002400000, value: 0.15 },
      ],
    },
  ];

  const mockEmptySeries: ChartSeries[] = [];

  const setupTest = (props = {}) => {
    const defaultProps = {
      series: mockSingleSeries,
      range: 1,
      ...props,
    };
    return renderWithProvider(<ChartLegend {...defaultProps} />);
  };

  describe('Component Rendering', () => {
    it('renders with single series data', () => {
      const { getByText } = setupTest();

      expect(getByText(/Outcome A/)).toBeOnTheScreen();
    });

    it('renders multiple series items', () => {
      const { getByText } = setupTest({ series: mockMultipleSeries });

      expect(getByText(/Outcome A/)).toBeOnTheScreen();
      expect(getByText(/Outcome B/)).toBeOnTheScreen();
    });

    it('renders nothing when series is empty', () => {
      const { queryByText } = setupTest({ series: mockEmptySeries });

      // Should not render any text since series is empty
      expect(queryByText(/Outcome/)).not.toBeOnTheScreen();
    });

    it('renders series label with value', () => {
      const { getByText } = setupTest();

      expect(getByText(/Outcome A 0\.8%/)).toBeOnTheScreen();
    });

    it('renders each series item', () => {
      const { getByText } = setupTest({ series: mockMultipleSeries });

      // Verify each series is rendered (color indicators are rendered as part of the layout)
      expect(getByText(/Outcome A/)).toBeOnTheScreen();
      expect(getByText(/Outcome B/)).toBeOnTheScreen();
    });
  });

  describe('Value Display', () => {
    it('displays last value when activeIndex is not provided', () => {
      const { getByText } = setupTest();

      // Last value in mockSingleSeries is 0.75, which with range 1 formats to "0.8"
      expect(getByText(/0\.8%/)).toBeOnTheScreen();
    });

    it('displays last value when activeIndex is -1', () => {
      const { getByText } = setupTest({ activeIndex: -1 });

      // Last value in mockSingleSeries is 0.75, which with range 1 formats to "0.8"
      expect(getByText(/0\.8%/)).toBeOnTheScreen();
    });

    it('displays value at activeIndex when provided', () => {
      const { getByText } = setupTest({ activeIndex: 0 });

      // First value in mockSingleSeries is 0.5, which with range 1 formats to "0.5"
      expect(getByText(/0\.5%/)).toBeOnTheScreen();
    });

    it('displays middle value when activeIndex points to middle', () => {
      const { getByText } = setupTest({ activeIndex: 1 });

      // Middle value in mockSingleSeries is 0.6
      expect(getByText(/0\.6%/)).toBeOnTheScreen();
    });

    it('displays em-dash when data is empty', () => {
      const seriesWithEmptyData: ChartSeries[] = [
        {
          label: 'Empty Series',
          color: '#4459FF',
          data: [],
        },
      ];

      const { getByText } = setupTest({ series: seriesWithEmptyData });

      expect(getByText(/Empty Series —/)).toBeOnTheScreen();
    });

    it('formats value with correct decimal places based on range', () => {
      const { getByText, rerender } = setupTest({ range: 0.5 });

      // Range < 1: 2 decimal places
      expect(getByText(/0\.75%/)).toBeOnTheScreen();

      // Re-render with different range
      rerender(<ChartLegend series={mockSingleSeries} range={5} />);

      // Range < 10: 1 decimal place
      expect(getByText(/0\.8%/)).toBeOnTheScreen();

      // Re-render with larger range
      rerender(<ChartLegend series={mockSingleSeries} range={15} />);

      // Range >= 10: 0 decimal places
      expect(getByText(/1%/)).toBeOnTheScreen();
    });
  });

  describe('Active Index Behavior', () => {
    it('updates displayed value when activeIndex changes', () => {
      const { getByText, rerender } = setupTest({ activeIndex: 0 });

      expect(getByText(/0\.5%/)).toBeOnTheScreen();

      rerender(
        <ChartLegend series={mockSingleSeries} range={1} activeIndex={2} />,
      );

      expect(getByText(/0\.8%/)).toBeOnTheScreen();
    });

    it('reverts to last value when activeIndex becomes undefined', () => {
      const { getByText, rerender } = setupTest({ activeIndex: 0 });

      expect(getByText(/0\.5%/)).toBeOnTheScreen();

      rerender(
        <ChartLegend
          series={mockSingleSeries}
          range={1}
          activeIndex={undefined}
        />,
      );

      expect(getByText(/0\.8%/)).toBeOnTheScreen();
    });

    it('shows last value when activeIndex is negative', () => {
      const { getByText } = setupTest({ activeIndex: -5 });

      expect(getByText(/0\.8%/)).toBeOnTheScreen();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty data array gracefully', () => {
      const seriesWithEmptyData: ChartSeries[] = [
        {
          label: 'Empty',
          color: '#4459FF',
          data: [],
        },
      ];

      const { getByText } = setupTest({ series: seriesWithEmptyData });

      expect(getByText(/Empty —/)).toBeOnTheScreen();
    });

    it('handles single data point', () => {
      const seriesWithSinglePoint: ChartSeries[] = [
        {
          label: 'Single Point',
          color: '#4459FF',
          data: [{ timestamp: 1640995200000, value: 0.42 }],
        },
      ];

      const { getByText } = setupTest({ series: seriesWithSinglePoint });

      expect(getByText(/Single Point 0\.4%/)).toBeOnTheScreen();
    });

    it('handles out-of-bounds activeIndex', () => {
      const { getByText } = setupTest({ activeIndex: 999 });

      // Out of bounds should return undefined, showing em-dash
      expect(getByText(/—/)).toBeOnTheScreen();
    });

    it('renders all series with different activeIndex values', () => {
      const { getByText } = setupTest({
        series: mockMultipleSeries,
        activeIndex: 1,
      });

      // Outcome A at index 1: 0.6
      expect(getByText(/Outcome A 0\.6%/)).toBeOnTheScreen();
      // Outcome B at index 1: 0.2
      expect(getByText(/Outcome B 0\.2%/)).toBeOnTheScreen();
    });

    it('handles very small values', () => {
      const seriesWithSmallValues: ChartSeries[] = [
        {
          label: 'Small',
          color: '#4459FF',
          data: [{ timestamp: 1640995200000, value: 0.001 }],
        },
      ];

      const { getByText } = setupTest({
        series: seriesWithSmallValues,
        range: 0.5,
      });

      expect(getByText(/Small 0\.00%/)).toBeOnTheScreen();
    });

    it('handles very large values', () => {
      const seriesWithLargeValues: ChartSeries[] = [
        {
          label: 'Large',
          color: '#4459FF',
          data: [{ timestamp: 1640995200000, value: 999.99 }],
        },
      ];

      const { getByText } = setupTest({
        series: seriesWithLargeValues,
        range: 100,
      });

      expect(getByText(/Large 1000%/)).toBeOnTheScreen();
    });
  });

  describe('Multiple Series', () => {
    it('renders correct values for all series at activeIndex', () => {
      const { getByText } = setupTest({
        series: mockMultipleSeries,
        activeIndex: 0,
      });

      expect(getByText(/Outcome A 0\.5%/)).toBeOnTheScreen();
      expect(getByText(/Outcome B 0\.3%/)).toBeOnTheScreen();
    });

    it('renders correct last values for all series when not dragging', () => {
      const { getByText } = setupTest({ series: mockMultipleSeries });

      expect(getByText(/Outcome A 0\.8%/)).toBeOnTheScreen();
      expect(getByText(/Outcome B 0\.1%/)).toBeOnTheScreen();
    });

    it('handles series with different data lengths', () => {
      const seriesWithDifferentLengths: ChartSeries[] = [
        {
          label: 'Long',
          color: '#4459FF',
          data: [
            { timestamp: 1, value: 0.1 },
            { timestamp: 2, value: 0.2 },
            { timestamp: 3, value: 0.3 },
          ],
        },
        {
          label: 'Short',
          color: '#FF6B6B',
          data: [{ timestamp: 1, value: 0.5 }],
        },
      ];

      const { getByText } = setupTest({
        series: seriesWithDifferentLengths,
        activeIndex: 2,
      });

      expect(getByText(/Long 0\.3%/)).toBeOnTheScreen();
      // Short series doesn't have index 2, should show em-dash
      expect(getByText(/Short —/)).toBeOnTheScreen();
    });
  });
});
