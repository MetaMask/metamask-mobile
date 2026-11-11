import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import TimeframeSelector from './TimeframeSelector';

describe('TimeframeSelector', () => {
  it('renders the configured timeframes', () => {
    const onSelect = jest.fn();

    const { getByText } = render(
      <TimeframeSelector selected="live" onSelect={onSelect} />,
    );

    expect(getByText('Live')).toBeDefined();
    expect(getByText('6H')).toBeDefined();
    expect(getByText('1D')).toBeDefined();
    expect(getByText('Max')).toBeDefined();
  });

  it('forwards an unselected timeframe to onSelect', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <TimeframeSelector selected="live" onSelect={onSelect} />,
    );

    fireEvent.press(getByText('6H'));

    expect(onSelect).toHaveBeenCalledWith('6h');
  });

  it('does not call onSelect when disabled', () => {
    const onSelect = jest.fn();
    const { getByText } = render(
      <TimeframeSelector selected="live" onSelect={onSelect} disabled />,
    );

    fireEvent.press(getByText('6H'));

    expect(onSelect).not.toHaveBeenCalled();
  });
});
