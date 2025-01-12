import React from 'react';
import { render } from '@testing-library/react-native';
import StakingEarningsHistory from './StakingEarningsHistory';
import useStakingEarningsHistory from '../../../hooks/useStakingEarningsHistory';
import { MOCK_STAKED_ETH_ASSET } from '../../../__mocks__/mockData';

jest.mock('../../../hooks/useStakingEarningsHistory');
jest.mock('react-native-svg-charts', () => {
  const reactNativeSvgCharts = jest.requireActual('react-native-svg-charts'); // Get the actual Grid component
  return {
    ...reactNativeSvgCharts,
    Grid: () => <></>,
  };
});

describe('StakingEarningsHistory', () => {
  beforeEach(() => {
    (useStakingEarningsHistory as jest.Mock).mockReturnValue({
      earningsHistory: [
        {
          dateStr: '2022-12-31',
          dailyRewards: '442219562575615',
          dailyRewardsUsd: '3000.00',
          sumRewards: '442219562575615',
        },
        {
          dateStr: '2023-01-01',
          dailyRewards: '542219562575615',
          dailyRewardsUsd: '6000.00',
          sumRewards: '984439125151230',
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

    expect(getByText('7D')).toBeTruthy();
    expect(getByText('M')).toBeTruthy();
    expect(getByText('Y')).toBeTruthy();
    expect(getByText('Lifetime earnings')).toBeTruthy();
    expect(getByText('0.00098 ETH')).toBeTruthy();
    expect(getByText('December')).toBeTruthy();
    expect(getByText('3000.00 USD')).toBeTruthy();
    expect(getByText('+ 0.00044 ETH')).toBeTruthy();
    expect(getByText('January')).toBeTruthy();
    expect(getByText('6000.00 USD')).toBeTruthy();
    expect(getByText('+ 0.00054 ETH')).toBeTruthy();
  });
});
