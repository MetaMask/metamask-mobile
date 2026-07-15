import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { playSelection } from '../../../../../util/haptics';
import { CreatePriceAlertTestIds } from '../constants';
import AlertPeriodToggle from './AlertPeriodToggle';

jest.mock('../../../../../util/haptics', () => ({
  playSelection: jest.fn(),
}));

const mockPlaySelection = playSelection as jest.MockedFunction<
  typeof playSelection
>;
const mockOnChange = jest.fn();

describe('AlertPeriodToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders both periods', () => {
    const screen = render(
      <AlertPeriodToggle value="24h" onChange={mockOnChange} />,
    );

    expect(
      screen.getByTestId(CreatePriceAlertTestIds.PERIOD_SEGMENT_24H),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(CreatePriceAlertTestIds.PERIOD_SEGMENT_1H),
    ).toBeOnTheScreen();
  });

  it('marks the selected period in accessibility state', () => {
    const screen = render(
      <AlertPeriodToggle value="1h" onChange={mockOnChange} />,
    );

    expect(
      screen.getByTestId(CreatePriceAlertTestIds.PERIOD_SEGMENT_24H).props
        .accessibilityState?.selected,
    ).toBe(false);
    expect(
      screen.getByTestId(CreatePriceAlertTestIds.PERIOD_SEGMENT_1H).props
        .accessibilityState?.selected,
    ).toBe(true);
  });

  it('selects a different period when pressed', () => {
    const screen = render(
      <AlertPeriodToggle value="24h" onChange={mockOnChange} />,
    );

    fireEvent.press(
      screen.getByTestId(CreatePriceAlertTestIds.PERIOD_SEGMENT_1H),
    );

    expect(mockOnChange).toHaveBeenCalledWith('1h');
  });

  it('plays selection feedback when the period changes', () => {
    const screen = render(
      <AlertPeriodToggle value="24h" onChange={mockOnChange} />,
    );

    fireEvent.press(
      screen.getByTestId(CreatePriceAlertTestIds.PERIOD_SEGMENT_1H),
    );

    expect(mockPlaySelection).toHaveBeenCalledTimes(1);
  });

  it('ignores presses on the selected period', () => {
    const screen = render(
      <AlertPeriodToggle value="24h" onChange={mockOnChange} />,
    );

    fireEvent.press(
      screen.getByTestId(CreatePriceAlertTestIds.PERIOD_SEGMENT_24H),
    );

    expect(mockOnChange).not.toHaveBeenCalled();
    expect(mockPlaySelection).not.toHaveBeenCalled();
  });

  it('ignores presses when disabled', () => {
    const screen = render(
      <AlertPeriodToggle value="24h" onChange={mockOnChange} isDisabled />,
    );

    fireEvent.press(
      screen.getByTestId(CreatePriceAlertTestIds.PERIOD_SEGMENT_1H),
    );

    expect(
      screen.getByTestId(CreatePriceAlertTestIds.PERIOD_SEGMENT_1H).props
        .accessibilityState?.disabled,
    ).toBe(true);
    expect(mockOnChange).not.toHaveBeenCalled();
    expect(mockPlaySelection).not.toHaveBeenCalled();
  });
});
