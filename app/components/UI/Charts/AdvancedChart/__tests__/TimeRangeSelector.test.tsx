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
    expect(getByText('1Y')).toBeOnTheScreen();
  });

  it('renders only specified ranges when ranges prop is provided', () => {
    const { getByText, queryByText } = render(
      <TimeRangeSelector {...defaultProps} ranges={['1H', '1D', '1W']} />,
    );

    expect(getByText('1H')).toBeOnTheScreen();
    expect(getByText('1D')).toBeOnTheScreen();
    expect(getByText('1W')).toBeOnTheScreen();
    expect(queryByText('1M')).not.toBeOnTheScreen();
    expect(queryByText('1Y')).not.toBeOnTheScreen();
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
      const ranges: TimeRange[] = ['1H', '1D', '1W', '1M', '1Y'];

      ranges.forEach((range) => {
        expect(TIME_RANGE_CONFIGS[range]).toBeDefined();
        expect(TIME_RANGE_CONFIGS[range].timePeriod).toBeTruthy();
      });
    });

    it('maps 1H to 1h time period', () => {
      expect(TIME_RANGE_CONFIGS['1H'].timePeriod).toBe('1h');
    });

    it('maps 1D to 1d time period', () => {
      expect(TIME_RANGE_CONFIGS['1D'].timePeriod).toBe('1d');
    });

    it('maps 1W to 1w time period', () => {
      expect(TIME_RANGE_CONFIGS['1W'].timePeriod).toBe('1w');
    });

    it('maps 1M to 1m time period', () => {
      expect(TIME_RANGE_CONFIGS['1M'].timePeriod).toBe('1m');
    });

    it('maps 1Y to 1y time period', () => {
      expect(TIME_RANGE_CONFIGS['1Y'].timePeriod).toBe('1y');
    });
  });
});
