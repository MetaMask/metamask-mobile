import React from 'react';
import StakingEarnings from '.';
import { strings } from '../../../../../../locales/i18n';
import { mockNetworkState } from '../../../../../util/test/network';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { selectPooledStakingServiceInterruptionBannerEnabledFlag } from '../../../Earn/selectors/featureFlags';
import { EARN_EXPERIENCES } from '../../../Earn/constants/experiences';

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

jest.mock('../../../../../selectors/earnController', () => ({
  ...jest.requireActual('../../../../../selectors/earnController'),
  earnSelectors: {
    selectEarnToken: jest.fn(),
    selectEarnTokenPair: jest.fn().mockReturnValue({
      outputToken: {
        symbol: 'ETH',
        name: 'Staked Ethereum',
        decimals: 18,
        address: '0x0',
        chainId: '0x1',
        experience: {
          type: 'POOLED_STAKING' as EARN_EXPERIENCES,
        },
      },
    }),
    selectEarnOutputToken: jest.fn(),
  },
}));

// Mock the feature flags selector
jest.mock('../../../Earn/selectors/featureFlags', () => ({
  selectStablecoinLendingEnabledFlag: jest.fn().mockReturnValue(true),
  selectPooledStakingEnabledFlag: jest.fn().mockReturnValue(true),
  selectPooledStakingServiceInterruptionBannerEnabledFlag: jest
    .fn()
    .mockReturnValue(false),
}));

jest.mock('../../../Earn/hooks/useEarnings', () => ({
  __esModule: true,
  default: () => ({
    annualRewardRate: '2.6%',
    lifetimeRewards: '2.5 ETH',
    lifetimeRewardsFiat: '$5000',
    estimatedAnnualEarnings: '2.5 ETH',
    estimatedAnnualEarningsFiat: '$5000',
    isLoadingEarningsData: false,
    hasEarnLendingPositions: false,
    hasEarnings: true,
    hasEarnPooledStakes: true,
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

const render = (state = STATE_MOCK) =>
  renderWithProvider(
    <StakingEarnings
      asset={{
        chainId: '0x1',
        symbol: 'ETH',
        address: '0x0',
        decimals: 18,
        image: '',
        name: '',
        aggregators: [],
        balance: '0',
        balanceFiat: '0',
        logo: '',
        isETH: true,
      }}
    />,
    {
      state,
    },
  );

describe('Staking Earnings', () => {
  it('should render correctly', () => {
    const { toJSON, getByText, queryByText } = render();

    expect(getByText(strings('stake.your_earnings'))).toBeDefined();
    expect(getByText(strings('stake.annual_rate'))).toBeDefined();
    expect(getByText(strings('stake.lifetime_rewards'))).toBeDefined();
    expect(getByText(strings('stake.estimated_annual_earnings'))).toBeDefined();
    expect(
      getByText(strings('earn.view_earnings_history.staking')),
    ).toBeDefined();
    expect(
      queryByText(
        strings('earn.service_interruption_banner.maintenance_message'),
      ),
    ).toBeNull();
    expect(toJSON()).toMatchSnapshot();
  });

  it('displays pooled-staking maintenance banner when feature flag is enabled', () => {
    (
      selectPooledStakingServiceInterruptionBannerEnabledFlag as jest.MockedFunction<
        typeof selectPooledStakingServiceInterruptionBannerEnabledFlag
      >
    ).mockReturnValue(true);

    const { toJSON, getByText } = render();

    expect(toJSON()).toMatchSnapshot();
    expect(
      getByText(
        strings('earn.service_interruption_banner.maintenance_message'),
      ),
    ).toBeDefined();
  });
});
