import React from 'react';
import { render } from '@testing-library/react-native';
import StakeEarningsHistoryView from './StakeEarningsHistoryView';
import useStakingEarningsHistory from '../../hooks/useStakingEarningsHistory';
import { MOCK_STAKED_ETH_ASSET } from '../../__mocks__/mockData';

jest.mock('../../hooks/useStakingEarningsHistory');
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      setOptions: jest.fn(),
    }),
  };
});

describe('StakeEarningsHistoryView', () => {
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

  it('renders correctly and matches snapshot', () => {
    const { toJSON } = render(
      <StakeEarningsHistoryView
        route={{
          key: '1',
          name: 'params',
          params: { asset: MOCK_STAKED_ETH_ASSET },
        }}
      />,
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
