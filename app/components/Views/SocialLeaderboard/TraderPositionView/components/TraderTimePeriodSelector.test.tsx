import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import TraderTimePeriodSelector from './TraderTimePeriodSelector';
import type { TimePeriod } from '../useTraderPositionData';

const TIME_PERIODS: readonly TimePeriod[] = ['1H', '1D', '1W', '1M', 'All'];
const FIT_TEST_ID = 'chart-fit-button';

describe('TraderTimePeriodSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a button for every time period', () => {
    renderWithProvider(
      <TraderTimePeriodSelector
        timePeriods={TIME_PERIODS}
        activeTimePeriod="1D"
        onSelectPeriod={jest.fn()}
      />,
    );

    TIME_PERIODS.forEach((period) => {
      expect(screen.getByText(period)).toBeOnTheScreen();
    });
  });

  it('invokes onSelectPeriod with the tapped period', () => {
    const onSelectPeriod = jest.fn();
    renderWithProvider(
      <TraderTimePeriodSelector
        timePeriods={TIME_PERIODS}
        activeTimePeriod="1D"
        onSelectPeriod={onSelectPeriod}
      />,
    );

    fireEvent.press(screen.getByText('1W'));

    expect(onSelectPeriod).toHaveBeenCalledWith('1W');
  });

  it('renders the fit button at the end of the pill row and fires onResetRange when tapped', () => {
    const onResetRange = jest.fn();
    renderWithProvider(
      <TraderTimePeriodSelector
        timePeriods={TIME_PERIODS}
        activeTimePeriod="1D"
        onSelectPeriod={jest.fn()}
        onResetRange={onResetRange}
        resetRangeTestID={FIT_TEST_ID}
      />,
    );

    const fitButton = screen.getByTestId(FIT_TEST_ID);
    expect(fitButton).toBeOnTheScreen();

    fireEvent.press(fitButton);

    expect(onResetRange).toHaveBeenCalledTimes(1);
  });

  it('hides the fit button when onResetRange is not provided', () => {
    renderWithProvider(
      <TraderTimePeriodSelector
        timePeriods={TIME_PERIODS}
        activeTimePeriod="1D"
        onSelectPeriod={jest.fn()}
        resetRangeTestID={FIT_TEST_ID}
      />,
    );

    expect(screen.queryByTestId(FIT_TEST_ID)).toBeNull();
  });
});
