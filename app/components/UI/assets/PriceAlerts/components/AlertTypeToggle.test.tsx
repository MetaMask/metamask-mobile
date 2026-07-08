import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AlertTypeToggle from './AlertTypeToggle';
import { PriceAlertType, CreatePriceAlertTestIds } from '../constants';

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
      <AlertTypeToggle
        value={PriceAlertType.PriceReaches}
        onChange={mockOnChange}
      />,
    );

    expect(
      getByTestId(CreatePriceAlertTestIds.PRICE_REACHES_TAB),
    ).toBeOnTheScreen();
    expect(
      getByTestId(CreatePriceAlertTestIds.PRICE_CHANGE_TAB),
    ).toBeOnTheScreen();
  });

  it('marks the active tab as selected via accessibilityState', () => {
    const { getByTestId, rerender } = render(
      <AlertTypeToggle
        value={PriceAlertType.PriceReaches}
        onChange={mockOnChange}
      />,
    );

    expect(
      getByTestId(CreatePriceAlertTestIds.PRICE_REACHES_TAB).props
        .accessibilityState?.selected,
    ).toBe(true);
    expect(
      getByTestId(CreatePriceAlertTestIds.PRICE_CHANGE_TAB).props
        .accessibilityState?.selected,
    ).toBe(false);

    rerender(
      <AlertTypeToggle
        value={PriceAlertType.PriceChange}
        onChange={mockOnChange}
      />,
    );

    expect(
      getByTestId(CreatePriceAlertTestIds.PRICE_REACHES_TAB).props
        .accessibilityState?.selected,
    ).toBe(false);
    expect(
      getByTestId(CreatePriceAlertTestIds.PRICE_CHANGE_TAB).props
        .accessibilityState?.selected,
    ).toBe(true);
  });

  it('both tabs have accessibilityRole="button"', () => {
    const { getByTestId } = render(
      <AlertTypeToggle
        value={PriceAlertType.PriceReaches}
        onChange={mockOnChange}
      />,
    );

    expect(
      getByTestId(CreatePriceAlertTestIds.PRICE_REACHES_TAB).props
        .accessibilityRole,
    ).toBe('button');
    expect(
      getByTestId(CreatePriceAlertTestIds.PRICE_CHANGE_TAB).props
        .accessibilityRole,
    ).toBe('button');
  });

  it('calls onChange with the new value when a different tab is pressed', () => {
    const { getByTestId } = render(
      <AlertTypeToggle
        value={PriceAlertType.PriceReaches}
        onChange={mockOnChange}
      />,
    );

    fireEvent.press(getByTestId(CreatePriceAlertTestIds.PRICE_CHANGE_TAB));

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith(PriceAlertType.PriceChange);
  });

  it('does not call onChange when the already-selected tab is pressed', () => {
    const { getByTestId } = render(
      <AlertTypeToggle
        value={PriceAlertType.PriceReaches}
        onChange={mockOnChange}
      />,
    );

    fireEvent.press(getByTestId(CreatePriceAlertTestIds.PRICE_REACHES_TAB));

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('plays haptic feedback when switching tabs, but not when re-pressing the current tab', () => {
    const { getByTestId } = render(
      <AlertTypeToggle
        value={PriceAlertType.PriceReaches}
        onChange={mockOnChange}
      />,
    );

    fireEvent.press(getByTestId(CreatePriceAlertTestIds.PRICE_REACHES_TAB));
    expect(mockPlaySelection).not.toHaveBeenCalled();

    fireEvent.press(getByTestId(CreatePriceAlertTestIds.PRICE_CHANGE_TAB));
    expect(mockPlaySelection).toHaveBeenCalledTimes(1);
  });
});
