import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { Box } from '@metamask/design-system-react-native';
import ChartTypeToggle from '../ChartTypeToggle';
import { ChartType } from '../AdvancedChart.types';

describe('ChartTypeToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when onChartTypeSelect is omitted', () => {
    const { toJSON } = render(<ChartTypeToggle chartType={ChartType.Line} />);

    expect(toJSON()).toBeNull();
  });

  it('renders line and candlestick toggle buttons', () => {
    const { getByLabelText } = render(
      <ChartTypeToggle
        chartType={ChartType.Line}
        onChartTypeSelect={jest.fn()}
      />,
    );

    expect(getByLabelText('Line chart')).toBeOnTheScreen();
    expect(getByLabelText('Candlestick chart')).toBeOnTheScreen();
  });

  it('highlights the line icon when line chart is active', () => {
    const { getByLabelText } = render(
      <ChartTypeToggle
        chartType={ChartType.Line}
        onChartTypeSelect={jest.fn()}
      />,
    );

    const lineIcon = getByLabelText('Line chart')
      .children[0] as ReactTestInstance;
    const candleIcon = getByLabelText('Candlestick chart')
      .children[0] as ReactTestInstance;

    expect(lineIcon.props.twClassName).toBe('text-icon-default');
    expect(candleIcon.props.twClassName).toBe('text-icon-alternative');
  });

  it('highlights the candlestick icon when candlestick chart is active', () => {
    const { getByLabelText } = render(
      <ChartTypeToggle
        chartType={ChartType.Candles}
        onChartTypeSelect={jest.fn()}
      />,
    );

    const candleIcon = getByLabelText('Candlestick chart')
      .children[0] as ReactTestInstance;
    const lineIcon = getByLabelText('Line chart')
      .children[0] as ReactTestInstance;

    expect(candleIcon.props.twClassName).toBe('text-icon-default');
    expect(lineIcon.props.twClassName).toBe('text-icon-alternative');
  });

  it('marks the active chart type button as selected for accessibility', () => {
    const { getByLabelText } = render(
      <ChartTypeToggle
        chartType={ChartType.Candles}
        onChartTypeSelect={jest.fn()}
      />,
    );

    expect(
      getByLabelText('Candlestick chart').props.accessibilityState,
    ).toEqual({ selected: true });
    expect(getByLabelText('Line chart').props.accessibilityState).toEqual({
      selected: false,
    });
  });

  it('calls onChartTypeSelect with line when line button is pressed', () => {
    const onChartTypeSelect = jest.fn();
    const { getByLabelText } = render(
      <ChartTypeToggle
        chartType={ChartType.Candles}
        onChartTypeSelect={onChartTypeSelect}
      />,
    );

    fireEvent.press(getByLabelText('Line chart'));

    expect(onChartTypeSelect).toHaveBeenCalledWith(ChartType.Line);
    expect(onChartTypeSelect).toHaveBeenCalledTimes(1);
  });

  it('calls onChartTypeSelect with candlestick when candlestick button is pressed', () => {
    const onChartTypeSelect = jest.fn();
    const { getByLabelText } = render(
      <ChartTypeToggle
        chartType={ChartType.Line}
        onChartTypeSelect={onChartTypeSelect}
      />,
    );

    fireEvent.press(getByLabelText('Candlestick chart'));

    expect(onChartTypeSelect).toHaveBeenCalledWith(ChartType.Candles);
    expect(onChartTypeSelect).toHaveBeenCalledTimes(1);
  });

  it('uses the default container classes when containerTwClassName is omitted', () => {
    const { UNSAFE_getByType } = render(
      <ChartTypeToggle
        chartType={ChartType.Line}
        onChartTypeSelect={jest.fn()}
      />,
    );

    const container = UNSAFE_getByType(Box);

    expect(container.props.twClassName).toBe(
      'ml-2 rounded-lg border border-border-muted p-0.5',
    );
  });

  it('applies custom container classes when containerTwClassName is provided', () => {
    const customClass = 'shrink-0 rounded-lg border border-border-muted p-0.5';
    const { UNSAFE_getByType } = render(
      <ChartTypeToggle
        chartType={ChartType.Line}
        onChartTypeSelect={jest.fn()}
        containerTwClassName={customClass}
      />,
    );

    const container = UNSAFE_getByType(Box);

    expect(container.props.twClassName).toBe(customClass);
  });
});
