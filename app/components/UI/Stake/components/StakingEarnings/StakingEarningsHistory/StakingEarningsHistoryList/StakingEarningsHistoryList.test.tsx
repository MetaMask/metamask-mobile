import React from 'react';
import { render } from '@testing-library/react-native';
import StakingEarningsHistoryList from './StakingEarningsHistoryList';

describe('StakingEarningsHistoryList', () => {
  const mockEarnings = [
    {
      label: 'Reward 1',
      amount: '1.0',
      amountUsd: '3000',
      groupLabel: 'Daily',
    },
    {
      label: 'Reward 2',
      amount: '2.0',
      amountUsd: '6000',
      groupLabel: 'Daily',
    },
  ];

  it('renders correctly with earnings data', () => {
    const { getByText } = render(
      <StakingEarningsHistoryList earnings={mockEarnings} symbol="ETH" />,
    );

    // Check if each earning is displayed
    mockEarnings.forEach((earning) => {
      expect(getByText(earning.label)).toBeTruthy();
      expect(getByText(`+ ${earning.amount} ETH`)).toBeTruthy();
      expect(getByText(`${earning.amountUsd} USD`)).toBeTruthy();
    });
  });
});
