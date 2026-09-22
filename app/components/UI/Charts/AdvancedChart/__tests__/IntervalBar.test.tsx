import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import IntervalBar from '../IntervalBar';
import { TOKEN_OVERVIEW_CHART_INTERVALS } from '../../../AssetOverview/Price/tokenOverviewChart.constants';

describe('IntervalBar', () => {
  it('renders every interval pill inside a horizontal scroll view', () => {
    const { getByText, UNSAFE_getByProps } = render(
      <IntervalBar selectedInterval="15m" onIntervalSelect={jest.fn()} />,
    );

    TOKEN_OVERVIEW_CHART_INTERVALS.forEach((interval) => {
      expect(getByText(interval)).toBeOnTheScreen();
    });

    const scrollRow = UNSAFE_getByProps({ horizontal: true });

    expect(scrollRow.props.showsHorizontalScrollIndicator).toBe(false);
  });

  it('calls onIntervalSelect with the tapped interval', () => {
    const onIntervalSelect = jest.fn();
    const { getByText } = render(
      <IntervalBar
        selectedInterval="15m"
        onIntervalSelect={onIntervalSelect}
      />,
    );

    fireEvent.press(getByText('1h'));

    expect(onIntervalSelect).toHaveBeenCalledWith('1H');
  });
});
