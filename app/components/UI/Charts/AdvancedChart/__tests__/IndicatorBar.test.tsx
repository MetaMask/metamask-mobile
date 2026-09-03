import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import IndicatorBar from '../IndicatorBar';

const TOGGLE_NAMES = ['BOL', 'RSI', 'Volume', 'MACD'] as const;

describe('IndicatorBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the MA button and all indicator toggles', () => {
    const { getByLabelText, getByText } = render(<IndicatorBar />);

    expect(getByLabelText('MA')).toBeOnTheScreen();
    expect(getByText('MA')).toBeOnTheScreen();
    TOGGLE_NAMES.forEach((name) => {
      expect(getByLabelText(name)).toBeOnTheScreen();
      expect(getByText(name)).toBeOnTheScreen();
    });
  });

  it('renders a custom MA label', () => {
    const { getByText } = render(<IndicatorBar maLabel="MA x2" />);

    expect(getByText('MA x2')).toBeOnTheScreen();
  });

  it('calls onIndicatorToggle with the indicator name when a toggle is pressed', () => {
    const onIndicatorToggle = jest.fn();
    const { getByLabelText } = render(
      <IndicatorBar onIndicatorToggle={onIndicatorToggle} />,
    );

    TOGGLE_NAMES.forEach((name) => {
      fireEvent.press(getByLabelText(name));
    });

    expect(onIndicatorToggle).toHaveBeenCalledTimes(TOGGLE_NAMES.length);
    expect(onIndicatorToggle).toHaveBeenNthCalledWith(1, 'BOL');
    expect(onIndicatorToggle).toHaveBeenNthCalledWith(2, 'RSI');
    expect(onIndicatorToggle).toHaveBeenNthCalledWith(3, 'Volume');
    expect(onIndicatorToggle).toHaveBeenNthCalledWith(4, 'MACD');
  });

  it('calls onMAPress when the MA button is pressed', () => {
    const onMAPress = jest.fn();
    const { getByLabelText } = render(<IndicatorBar onMAPress={onMAPress} />);

    fireEvent.press(getByLabelText('MA'));

    expect(onMAPress).toHaveBeenCalledTimes(1);
  });
});
