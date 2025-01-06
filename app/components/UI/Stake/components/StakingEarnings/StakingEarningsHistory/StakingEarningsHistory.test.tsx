import React from 'react';
import { render } from '@testing-library/react-native';
import StakingEarningsHistory from './StakingEarningsHistory';
import useStakingEarningsHistory from '../../../hooks/useStakingEarningsHistory';
import { MOCK_STAKED_ETH_ASSET } from '../../../__mocks__/mockData';

jest.mock('../../../hooks/useStakingEarningsHistory');

describe('StakingEarningsHistory', () => {
  const mockAsset = {
    symbol: 'ETH',
    decimals: 18,
    isETH: true,
  };

  beforeEach(() => {
    (useStakingEarningsHistory as jest.Mock).mockReturnValue({
      earningsHistory: [
        {
          dateStr: '2023-01-01',
          dailyRewards: '1.0',
          dailyRewardsUsd: '3000',
          sumRewards: '10.0',
        },
        {
          dateStr: '2023-01-02',
          dailyRewards: '2.0',
          dailyRewardsUsd: '6000',
          sumRewards: '20.0',
        },
      ],
      isLoading: false,
      error: null,
    });
  });

  it('renders correctly with earnings history', () => {
    const { getByText } = render(
      <StakingEarningsHistory asset={MOCK_STAKED_ETH_ASSET} />,
    );

    // Check if the component renders the correct title
    expect(getByText('Your Earnings')).toBeTruthy();

    // Check if the earnings history is displayed
    expect(getByText('Date: 2023-01-01')).toBeTruthy();
    expect(getByText('Daily Rewards: 1.0 ETH')).toBeTruthy();
    expect(getByText('Total Rewards: 10.0 ETH')).toBeTruthy();

    expect(getByText('Date: 2023-01-02')).toBeTruthy();
    expect(getByText('Daily Rewards: 2.0 ETH')).toBeTruthy();
    expect(getByText('Total Rewards: 20.0 ETH')).toBeTruthy();
  });

  it('displays loading state correctly', () => {
    (useStakingEarningsHistory as jest.Mock).mockReturnValue({
      earningsHistory: [],
      isLoading: true,
      error: null,
    });

    const { getByText } = render(<StakingEarningsHistory asset={mockAsset} />);

    // Check if loading indicator is displayed
    expect(getByText('Loading...')).toBeTruthy();
  });

  it('displays error message when there is an error', () => {
    (useStakingEarningsHistory as jest.Mock).mockReturnValue({
      earningsHistory: [],
      isLoading: false,
      error: 'Failed to fetch earnings history',
    });

    const { getByText } = render(<StakingEarningsHistory asset={mockAsset} />);

    // Check if error message is displayed
    expect(getByText('Failed to fetch earnings history')).toBeTruthy();
  });
});
