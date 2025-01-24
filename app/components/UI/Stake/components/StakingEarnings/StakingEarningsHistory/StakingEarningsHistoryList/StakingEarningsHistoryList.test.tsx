import React from 'react';
import { render } from '@testing-library/react-native';
import StakingEarningsHistoryList from './StakingEarningsHistoryList';

describe('StakingEarningsHistoryList', () => {
  const mockEarnings = [
    {
      label: 'Reward 1',
      amount: '1.0',
      amountSecondaryText: '$3000.00',
      groupLabel: 'Daily',
      groupHeader: '2024',
      ticker: 'ETH',
    },
    {
      label: 'Reward 2',
      amount: '3.0',
      amountSecondaryText: '$5000.00',
      groupLabel: 'Daily',
      groupHeader: '2024',
      ticker: 'ETH',
    },
    {
      label: 'Reward 3',
      amount: '2.0',
      amountSecondaryText: '$6000.00',
      groupLabel: 'Daily',
      groupHeader: '2025',
      ticker: 'ETH',
    },
  ];

  it('renders correctly with earnings data', () => {
    const { getByText, getAllByText } = render(
      <StakingEarningsHistoryList earnings={mockEarnings} />,
    );

    // Check if each earning is displayed
    mockEarnings.forEach((earning) => {
      expect(getByText(earning.label)).toBeTruthy();
      expect(getByText(`+ ${earning.amount} ETH`)).toBeTruthy();
      expect(getByText(earning.amountSecondaryText)).toBeTruthy();
      expect(getAllByText(`2024`)).toHaveLength(1);
      expect(getAllByText(`2025`)).toHaveLength(1);
    });
  });
});
