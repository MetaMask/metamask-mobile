import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TimePeriodButtonGroup from './StakingEarningsTimePeriod';
import { DateRange } from './StakingEarningsTimePeriod.types';
describe('TimePeriodButtonGroup', () => {
  const mockOnTimePeriodChange = jest.fn();

  it('renders correctly and allows time period selection', () => {
    const { getByText } = render(
      <TimePeriodButtonGroup
        initialTimePeriod={DateRange.MONTHLY}
        onTimePeriodChange={mockOnTimePeriodChange}
      />,
    );

    // Check if the initial time period button is rendered
    expect(getByText('M')).toBeTruthy();

    // Simulate selecting a different time period
    fireEvent.press(getByText('7D'));

    // Check if the onTimePeriodChange function is called with the correct argument
    expect(mockOnTimePeriodChange).toHaveBeenCalledWith(DateRange.DAILY);
  });

  it('renders all time period options', () => {
    const { getByText } = render(
      <TimePeriodButtonGroup
        initialTimePeriod={DateRange.MONTHLY}
        onTimePeriodChange={mockOnTimePeriodChange}
      />,
    );

    // Check if all time period buttons are rendered
    expect(getByText('7D')).toBeTruthy();
    expect(getByText('M')).toBeTruthy();
    expect(getByText('Y')).toBeTruthy();
  });
});
