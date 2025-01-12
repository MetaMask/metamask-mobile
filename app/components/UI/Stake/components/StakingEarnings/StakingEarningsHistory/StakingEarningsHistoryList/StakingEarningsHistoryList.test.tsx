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
      groupHeader: '2024',
    },
    {
      label: 'Reward 2',
      amount: '3.0',
      amountUsd: '5000',
      groupLabel: 'Daily',
      groupHeader: '2024',
    },
    {
      label: 'Reward 3',
      amount: '2.0',
      amountUsd: '6000',
      groupLabel: 'Daily',
      groupHeader: '2025',
    },
  ];

  it('renders correctly with earnings data', () => {
    const { getByText, getAllByText } = render(
      <StakingEarningsHistoryList earnings={mockEarnings} ticker="ETH" />,
    );

    // Check if each earning is displayed
    mockEarnings.forEach((earning) => {
      expect(getByText(earning.label)).toBeTruthy();
      expect(getByText(`+ ${earning.amount} ETH`)).toBeTruthy();
      expect(getByText(`${earning.amountUsd} USD`)).toBeTruthy();
      expect(getAllByText(`2024`)).toHaveLength(1);
      expect(getAllByText(`2025`)).toHaveLength(1);
    });
  });
});
