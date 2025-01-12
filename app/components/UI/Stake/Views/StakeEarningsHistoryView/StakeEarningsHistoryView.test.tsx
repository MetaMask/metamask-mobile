import React from 'react';
import { render } from '@testing-library/react-native';
import StakeEarningsHistoryView from './StakeEarningsHistoryView';
import useStakingEarningsHistory from '../../hooks/useStakingEarningsHistory';
import { MOCK_STAKED_ETH_ASSET } from '../../__mocks__/mockData';
import { fireLayoutEvent } from '../../../../../util/testUtils/react-native-svg-charts';

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
jest.mock('react-native-svg-charts', () => {
  const reactNativeSvgCharts = jest.requireActual('react-native-svg-charts'); // Get the actual Grid component
  return {
    ...reactNativeSvgCharts,
    Grid: () => <></>,
  };
});

(useStakingEarningsHistory as jest.Mock).mockReturnValue({
  earningsHistory: [
    {
      dateStr: '2023-01-01',
      dailyRewards: '10000000000000',
      dailyRewardsUsd: '3000',
      sumRewards: '10000000000000',
    },
    {
      dateStr: '2023-01-02',
      dailyRewards: '10000000000000',
      dailyRewardsUsd: '6000',
      sumRewards: '20000000000000',
    },
  ],
  isLoading: false,
  error: null,
});

const earningsHistoryView = (
  <StakeEarningsHistoryView
    route={{
      key: '1',
      name: 'params',
      params: { asset: MOCK_STAKED_ETH_ASSET },
    }}
  />
);

describe('StakeEarningsHistoryView', () => {
  it('renders correctly and matches snapshot', () => {
    const renderedView = render(earningsHistoryView);
    fireLayoutEvent(renderedView.root);
    expect(renderedView.toJSON()).toMatchSnapshot();
  });
});
