import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TimeRangeSelector, {
  TIME_RANGE_CONFIGS,
  type TimeRange,
} from '../TimeRangeSelector';

describe('TimeRangeSelector', () => {
  const defaultProps = {
    selected: '1D' as TimeRange,
    onSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all time range buttons by default', () => {
    const { getByText } = render(<TimeRangeSelector {...defaultProps} />);

    expect(getByText('1H')).toBeOnTheScreen();
    expect(getByText('1D')).toBeOnTheScreen();
    expect(getByText('1W')).toBeOnTheScreen();
    expect(getByText('1M')).toBeOnTheScreen();
    expect(getByText('YTD')).toBeOnTheScreen();
    expect(getByText('ALL')).toBeOnTheScreen();
  });

  it('renders only specified ranges when ranges prop is provided', () => {
    const { getByText, queryByText } = render(
      <TimeRangeSelector {...defaultProps} ranges={['1H', '1D', '1W']} />,
    );

    expect(getByText('1H')).toBeOnTheScreen();
    expect(getByText('1D')).toBeOnTheScreen();
    expect(getByText('1W')).toBeOnTheScreen();
    expect(queryByText('1M')).not.toBeOnTheScreen();
    expect(queryByText('YTD')).not.toBeOnTheScreen();
    expect(queryByText('ALL')).not.toBeOnTheScreen();
  });

  it('calls onSelect with the tapped range', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <TimeRangeSelector {...defaultProps} onSelect={onSelect} />,
    );

    fireEvent.press(getByText('1W'));

    expect(onSelect).toHaveBeenCalledWith('1W');
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('calls onSelect when tapping the already selected range', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <TimeRangeSelector selected="1D" onSelect={onSelect} />,
    );

    fireEvent.press(getByText('1D'));

    expect(onSelect).toHaveBeenCalledWith('1D');
  });

  describe('TIME_RANGE_CONFIGS', () => {
    it('has a config for every time range', () => {
      const ranges: TimeRange[] = ['1H', '1D', '1W', '1M', 'YTD', 'ALL'];

      ranges.forEach((range) => {
        expect(TIME_RANGE_CONFIGS[range]).toBeDefined();
        expect(TIME_RANGE_CONFIGS[range].hlInterval).toBeTruthy();
        expect(TIME_RANGE_CONFIGS[range].count).toBeGreaterThan(0);
      });
    });

    it('maps 1H to 1-minute candles', () => {
      expect(TIME_RANGE_CONFIGS['1H'].hlInterval).toBe('1m');
      expect(TIME_RANGE_CONFIGS['1H'].count).toBe(60);
    });

    it('maps 1D to 15-minute candles', () => {
      expect(TIME_RANGE_CONFIGS['1D'].hlInterval).toBe('15m');
      expect(TIME_RANGE_CONFIGS['1D'].count).toBe(96);
    });

    it('maps 1W to 1-hour candles', () => {
      expect(TIME_RANGE_CONFIGS['1W'].hlInterval).toBe('1h');
      expect(TIME_RANGE_CONFIGS['1W'].count).toBe(168);
    });

    it('maps 1M to 4-hour candles', () => {
      expect(TIME_RANGE_CONFIGS['1M'].hlInterval).toBe('4h');
      expect(TIME_RANGE_CONFIGS['1M'].count).toBe(180);
    });

    it('maps ALL to daily candles with 500 count', () => {
      expect(TIME_RANGE_CONFIGS.ALL.hlInterval).toBe('1d');
      expect(TIME_RANGE_CONFIGS.ALL.count).toBe(500);
    });

    it('maps YTD to daily candles capped at 500', () => {
      expect(TIME_RANGE_CONFIGS.YTD.hlInterval).toBe('1d');
      expect(TIME_RANGE_CONFIGS.YTD.count).toBeGreaterThan(0);
      expect(TIME_RANGE_CONFIGS.YTD.count).toBeLessThanOrEqual(500);
    });
  });
});
