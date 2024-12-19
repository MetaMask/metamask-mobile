import React from 'react';
import StakingEarnings from './';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { strings } from '../../../../../../locales/i18n';
import { mockNetworkState } from '../../../../../util/test/network';

jest.mock('../../constants', () => ({
  isPooledStakingFeatureEnabled: jest.fn().mockReturnValue(true),
}));

const mockNavigate = jest.fn();

const STATE_MOCK = {
  engine: {
    backgroundState: {
      NetworkController: {
        ...mockNetworkState({
          chainId: '0x1',
        }),
      },
    },
  },
};

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

jest.mock('../../hooks/useStakingEarnings', () => ({
  __esModule: true,
  default: () => ({
    annualRewardRate: '2.6%',
    lifetimeRewardsETH: '2.5 ETH',
    lifetimeRewardsFiat: '$5000',
    estimatedAnnualEarningsETH: '2.5 ETH',
    estimatedAnnualEarningsFiat: '$5000',
    isLoadingEarningsData: false,
    hasStakedPositions: true,
  }),
}));

jest.mock('../../hooks/usePooledStakes', () => ({
  __esModule: true,
  default: () => ({
    hasStakedPositions: true,
  }),
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      getNetworkClientById: () => ({
        configuration: {
          chainId: '0x1',
          rpcUrl: 'https://mainnet.infura.io/v3',
          ticker: 'ETH',
          type: 'custom',
        },
      }),
      findNetworkClientIdByChainId: () => 'mainnet',
    },
  },
}));

describe('Staking Earnings', () => {
  it('should render correctly', () => {
    const { toJSON, getByText } = renderWithProvider(<StakingEarnings />, {
      state: STATE_MOCK,
    });

    expect(getByText(strings('stake.your_earnings'))).toBeDefined();
    expect(getByText(strings('stake.annual_rate'))).toBeDefined();
    expect(getByText(strings('stake.lifetime_rewards'))).toBeDefined();
    expect(getByText(strings('stake.estimated_annual_earnings'))).toBeDefined();
    expect(toJSON()).toMatchSnapshot();
  });
});
