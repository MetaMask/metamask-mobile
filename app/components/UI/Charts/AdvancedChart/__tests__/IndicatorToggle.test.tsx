import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import IndicatorToggle from '../IndicatorToggle';
import type { IndicatorType } from '../AdvancedChart.types';

describe('IndicatorToggle', () => {
  const mockOnToggle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all indicator buttons', () => {
    const { getByText } = render(
      <IndicatorToggle activeIndicators={[]} onToggle={mockOnToggle} />,
    );

    expect(getByText('MACD')).toBeTruthy();
    expect(getByText('RSI')).toBeTruthy();
    expect(getByText('MA(200)')).toBeTruthy();
  });

  it('calls onToggle when a button is pressed', () => {
    const { getByText } = render(
      <IndicatorToggle activeIndicators={[]} onToggle={mockOnToggle} />,
    );

    fireEvent.press(getByText('MACD'));
    expect(mockOnToggle).toHaveBeenCalledWith('MACD');

    fireEvent.press(getByText('RSI'));
    expect(mockOnToggle).toHaveBeenCalledWith('RSI');
  });

  it('does not call onToggle when disabled', () => {
    const { getByText } = render(
      <IndicatorToggle
        activeIndicators={[]}
        onToggle={mockOnToggle}
        disabled
      />,
    );

    fireEvent.press(getByText('MACD'));
    expect(mockOnToggle).not.toHaveBeenCalled();
  });

  it('sets correct accessibility state for active indicators', () => {
    const activeIndicators: IndicatorType[] = ['MACD'];
    const { getByLabelText } = render(
      <IndicatorToggle
        activeIndicators={activeIndicators}
        onToggle={mockOnToggle}
      />,
    );

    const macdButton = getByLabelText('MACD indicator enabled');
    expect(macdButton.props.accessibilityState).toEqual({
      selected: true,
      disabled: false,
    });

    const rsiButton = getByLabelText('RSI indicator disabled');
    expect(rsiButton.props.accessibilityState).toEqual({
      selected: false,
      disabled: false,
    });
  });

  it('renders the Indicators label', () => {
    const { getByText } = render(
      <IndicatorToggle activeIndicators={[]} onToggle={mockOnToggle} />,
    );

    expect(getByText('Indicators:')).toBeTruthy();
  });
});
