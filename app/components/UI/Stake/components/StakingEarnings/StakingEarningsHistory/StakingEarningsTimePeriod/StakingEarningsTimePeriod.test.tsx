import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TimePeriodButtonGroup, { DateRange } from './StakingEarningsTimePeriod';

describe('TimePeriodButtonGroup', () => {
  const mockOnTimePeriodChange = jest.fn();

  it('renders correctly and allows time period selection', () => {
    const { getByText } = render(
      <TimePeriodButtonGroup
        initialTimePeriod={DateRange.DAILY}
        onTimePeriodChange={mockOnTimePeriodChange}
      />,
    );

    // Check if the initial time period button is rendered
    expect(getByText('Daily')).toBeTruthy();

    // Simulate selecting a different time period
    fireEvent.press(getByText('Monthly'));

    // Check if the onTimePeriodChange function is called with the correct argument
    expect(mockOnTimePeriodChange).toHaveBeenCalledWith(DateRange.MONTHLY);
  });

  it('renders all time period options', () => {
    const { getByText } = render(
      <TimePeriodButtonGroup
        initialTimePeriod={DateRange.DAILY}
        onTimePeriodChange={mockOnTimePeriodChange}
      />,
    );

    // Check if all time period buttons are rendered
    expect(getByText('Daily')).toBeTruthy();
    expect(getByText('Weekly')).toBeTruthy();
    expect(getByText('Monthly')).toBeTruthy();
    expect(getByText('Yearly')).toBeTruthy();
  });
});
