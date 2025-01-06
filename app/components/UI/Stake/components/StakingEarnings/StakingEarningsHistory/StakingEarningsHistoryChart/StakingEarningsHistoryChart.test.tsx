import React from 'react';
import { render } from '@testing-library/react-native';
import StakingEarningsHistoryChart from './StakingEarningsHistoryChart';

describe('StakingEarningsHistoryChart', () => {
  const mockData = {
    earnings: [
      { value: 1.5, label: 'Day 1' },
      { value: 2.0, label: 'Day 2' },
      { value: 2.5, label: 'Day 3' },
    ],
    earningsTotal: '6.0',
    symbol: 'ETH',
  };

  it('renders correctly with given data', () => {
    const { getByText } = render(
      <StakingEarningsHistoryChart data={mockData} />,
    );

    // Check if the total earnings are displayed
    expect(getByText('Total Earnings: 6.0 ETH')).toBeTruthy();

    // Check if each day's earnings are displayed
    mockData.earnings.forEach((entry) => {
      expect(getByText(`${entry.label}: ${entry.value} ETH`)).toBeTruthy();
    });
  });

  it('renders correctly when no data is provided', () => {
    const { getByText } = render(
      <StakingEarningsHistoryChart
        data={{ earnings: [], earningsTotal: '0', symbol: 'ETH' }}
      />,
    );

    // Check if a message indicating no data is displayed
    expect(getByText('No earnings data available')).toBeTruthy();
  });
});
