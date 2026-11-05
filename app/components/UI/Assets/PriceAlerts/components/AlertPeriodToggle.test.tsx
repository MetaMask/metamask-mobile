import React from 'react';
import { StyleSheet } from 'react-native';
import { fireEvent, render, within } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { playSelection } from '../../../../../util/haptics';
import { CreatePriceAlertTestIds } from '../constants';
import AlertPeriodToggle from './AlertPeriodToggle';

jest.mock('../../../../../util/haptics', () => ({
  playSelection: jest.fn(() => Promise.resolve()),
}));

const mockPlaySelection = playSelection as jest.MockedFunction<
  typeof playSelection
>;
const mockOnChange = jest.fn();

const openSheet = (screen: ReturnType<typeof render>) => {
  fireEvent.press(screen.getByTestId(CreatePriceAlertTestIds.PERIOD_SEGMENT));
};

describe('AlertPeriodToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows the selected period on the button and hides options until opened', () => {
    const screen = render(
      <AlertPeriodToggle value="24h" onChange={mockOnChange} />,
    );

    expect(
      screen.getByTestId(CreatePriceAlertTestIds.PERIOD_SEGMENT),
    ).toHaveTextContent(strings('price_alerts.period_24h'));
    expect(
      screen.queryByTestId(CreatePriceAlertTestIds.PERIOD_SEGMENT_24H),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId(CreatePriceAlertTestIds.PERIOD_SEGMENT_1H),
    ).not.toBeOnTheScreen();

    openSheet(screen);

    expect(
      screen.getByTestId(CreatePriceAlertTestIds.PERIOD_SHEET),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(CreatePriceAlertTestIds.PERIOD_SEGMENT_24H),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(CreatePriceAlertTestIds.PERIOD_SEGMENT_1H),
    ).toBeOnTheScreen();
  });

  it('renders 5 minutes only when enabled for perpetuals', () => {
    const spotScreen = render(
      <AlertPeriodToggle value="24h" onChange={mockOnChange} />,
    );
    openSheet(spotScreen);

    expect(
      spotScreen.queryByTestId(CreatePriceAlertTestIds.PERIOD_SEGMENT_5M),
    ).not.toBeOnTheScreen();

    const perpsScreen = render(
      <AlertPeriodToggle
        value="24h"
        onChange={mockOnChange}
        includeFiveMinutes
      />,
    );
    openSheet(perpsScreen);

    expect(
      perpsScreen.getByTestId(CreatePriceAlertTestIds.PERIOD_SEGMENT_5M),
    ).toBeOnTheScreen();
  });

  it('highlights the selected period and shows a check', () => {
    const screen = render(
      <AlertPeriodToggle value="1h" onChange={mockOnChange} />,
    );

    openSheet(screen);

    const selected = screen.getByTestId(
      CreatePriceAlertTestIds.PERIOD_SEGMENT_1H,
    );
    const unselected = screen.getByTestId(
      CreatePriceAlertTestIds.PERIOD_SEGMENT_24H,
    );
    const resolveStyle = (style: unknown) =>
      StyleSheet.flatten(
        typeof style === 'function' ? style({ pressed: false }) : style,
      );

    expect(
      within(selected).getByTestId(CreatePriceAlertTestIds.PERIOD_CHECK),
    ).toBeOnTheScreen();
    expect(
      within(unselected).queryByTestId(CreatePriceAlertTestIds.PERIOD_CHECK),
    ).not.toBeOnTheScreen();
    expect(resolveStyle(selected.props.style).backgroundColor).toBeTruthy();
    expect(resolveStyle(unselected.props.style).backgroundColor).toBeFalsy();
    expect(resolveStyle(selected.props.style).height).toBe(56);
    expect(resolveStyle(unselected.props.style).height).toBe(56);
  });

  it('marks the selected period in accessibility state', () => {
    const screen = render(
      <AlertPeriodToggle value="1h" onChange={mockOnChange} />,
    );
    openSheet(screen);

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
    openSheet(screen);

    fireEvent.press(
      screen.getByTestId(CreatePriceAlertTestIds.PERIOD_SEGMENT_1H),
    );

    expect(mockOnChange).toHaveBeenCalledWith('1h');
    expect(
      screen.queryByTestId(CreatePriceAlertTestIds.PERIOD_SHEET),
    ).not.toBeOnTheScreen();
  });

  it('plays selection feedback when the period changes', () => {
    const screen = render(
      <AlertPeriodToggle value="24h" onChange={mockOnChange} />,
    );
    openSheet(screen);

    fireEvent.press(
      screen.getByTestId(CreatePriceAlertTestIds.PERIOD_SEGMENT_1H),
    );

    expect(mockPlaySelection).toHaveBeenCalledTimes(1);
  });

  it('ignores presses on the selected period', () => {
    const screen = render(
      <AlertPeriodToggle value="24h" onChange={mockOnChange} />,
    );
    openSheet(screen);

    fireEvent.press(
      screen.getByTestId(CreatePriceAlertTestIds.PERIOD_SEGMENT_24H),
    );

    expect(mockOnChange).not.toHaveBeenCalled();
    expect(mockPlaySelection).not.toHaveBeenCalled();
    expect(
      screen.queryByTestId(CreatePriceAlertTestIds.PERIOD_SHEET),
    ).not.toBeOnTheScreen();
  });
});
