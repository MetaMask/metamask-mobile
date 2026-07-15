import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AlertTypeToggle from './AlertTypeToggle';
import { CreatePriceAlertTestIds } from '../constants';

jest.mock('../../../../../util/haptics', () => ({
  playSelection: jest.fn(),
}));

import { playSelection } from '../../../../../util/haptics';
const mockPlaySelection = playSelection as jest.MockedFunction<
  typeof playSelection
>;

const mockOnChange = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AlertTypeToggle', () => {
  it('renders both tabs', () => {
    const { getByTestId } = render(
      <AlertTypeToggle value="absolute_price" onChange={mockOnChange} />,
    );

    expect(
      getByTestId(CreatePriceAlertTestIds.TYPE_SEGMENT_TARGET),
    ).toBeOnTheScreen();
    expect(
      getByTestId(CreatePriceAlertTestIds.TYPE_SEGMENT_CHANGE),
    ).toBeOnTheScreen();
  });

  it('marks the active tab as selected via accessibilityState', () => {
    const { getByTestId, rerender } = render(
      <AlertTypeToggle value="absolute_price" onChange={mockOnChange} />,
    );

    expect(
      getByTestId(CreatePriceAlertTestIds.TYPE_SEGMENT_TARGET).props
        .accessibilityState?.selected,
    ).toBe(true);
    expect(
      getByTestId(CreatePriceAlertTestIds.TYPE_SEGMENT_CHANGE).props
        .accessibilityState?.selected,
    ).toBe(false);

    rerender(
      <AlertTypeToggle value="percent_change" onChange={mockOnChange} />,
    );

    expect(
      getByTestId(CreatePriceAlertTestIds.TYPE_SEGMENT_TARGET).props
        .accessibilityState?.selected,
    ).toBe(false);
    expect(
      getByTestId(CreatePriceAlertTestIds.TYPE_SEGMENT_CHANGE).props
        .accessibilityState?.selected,
    ).toBe(true);
  });

  it('both tabs have accessibilityRole="button"', () => {
    const { getByTestId } = render(
      <AlertTypeToggle value="absolute_price" onChange={mockOnChange} />,
    );

    expect(
      getByTestId(CreatePriceAlertTestIds.TYPE_SEGMENT_TARGET).props
        .accessibilityRole,
    ).toBe('button');
    expect(
      getByTestId(CreatePriceAlertTestIds.TYPE_SEGMENT_CHANGE).props
        .accessibilityRole,
    ).toBe('button');
  });

  it('calls onChange with the new value when a different tab is pressed', () => {
    const { getByTestId } = render(
      <AlertTypeToggle value="absolute_price" onChange={mockOnChange} />,
    );

    fireEvent.press(getByTestId(CreatePriceAlertTestIds.TYPE_SEGMENT_CHANGE));

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith('percent_change');
  });

  it('does not call onChange when the already-selected tab is pressed', () => {
    const { getByTestId } = render(
      <AlertTypeToggle value="absolute_price" onChange={mockOnChange} />,
    );

    fireEvent.press(getByTestId(CreatePriceAlertTestIds.TYPE_SEGMENT_TARGET));

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('plays haptic feedback when switching tabs, but not when re-pressing the current tab', () => {
    const { getByTestId } = render(
      <AlertTypeToggle value="absolute_price" onChange={mockOnChange} />,
    );

    fireEvent.press(getByTestId(CreatePriceAlertTestIds.TYPE_SEGMENT_TARGET));
    expect(mockPlaySelection).not.toHaveBeenCalled();

    fireEvent.press(getByTestId(CreatePriceAlertTestIds.TYPE_SEGMENT_CHANGE));
    expect(mockPlaySelection).toHaveBeenCalledTimes(1);
  });

  it('disables both tabs and ignores presses when isDisabled (edit mode)', () => {
    const { getByTestId } = render(
      <AlertTypeToggle
        value="absolute_price"
        onChange={mockOnChange}
        isDisabled
      />,
    );

    expect(
      getByTestId(CreatePriceAlertTestIds.TYPE_SEGMENT_TARGET).props.disabled,
    ).toBe(true);
    expect(
      getByTestId(CreatePriceAlertTestIds.TYPE_SEGMENT_CHANGE).props.disabled,
    ).toBe(true);

    fireEvent.press(getByTestId(CreatePriceAlertTestIds.TYPE_SEGMENT_CHANGE));

    expect(mockOnChange).not.toHaveBeenCalled();
    expect(mockPlaySelection).not.toHaveBeenCalled();
  });
});
