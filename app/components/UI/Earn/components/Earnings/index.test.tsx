import React, { act } from 'react';
import Earnings from '.';
import { strings } from '../../../../../../locales/i18n';
import { mockNetworkState } from '../../../../../util/test/network';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import {
  selectPooledStakingServiceInterruptionBannerEnabledFlag,
  selectStablecoinLendingServiceInterruptionBannerEnabledFlag,
} from '../../selectors/featureFlags';
import { earnSelectors } from '../../../../../selectors/earnController';
import { EarnTokenDetails } from '../../types/lending.types';
import Routes from '../../../../../constants/navigation/Routes';
import { fireEvent } from '@testing-library/react-native';

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
jest.mock('../../selectors/featureFlags', () => ({
  selectStablecoinLendingEnabledFlag: jest.fn().mockReturnValue(true),
  selectStablecoinLendingServiceInterruptionBannerEnabledFlag: jest
    .fn()
    .mockReturnValue(false),
  selectPooledStakingEnabledFlag: jest.fn().mockReturnValue(true),
  selectPooledStakingServiceInterruptionBannerEnabledFlag: jest
    .fn()
    .mockReturnValue(false),
}));

jest.mock('../../hooks/useEarnings', () => ({
  __esModule: true,
  default: () => ({
    annualRewardRate: '2.6%',
    lifetimeRewards: '2.5 ETH',
    lifetimeRewardsFiat: '$5000',
    estimatedAnnualEarnings: '2.5 ETH',
    estimatedAnnualEarningsFiat: '$5000',
    isLoadingEarningsData: false,
    hasEarnLendingPositions: true,
    hasEarnings: true,
    hasEarnPooledStakes: true,
  }),
}));

jest.mock('../../../Stake/hooks/usePooledStakes', () => ({
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
    <Earnings
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

describe('Earnings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

  it('displays lending maintenance banner when feature flag is enabled', () => {
    (
      selectStablecoinLendingServiceInterruptionBannerEnabledFlag as jest.MockedFunction<
        typeof selectStablecoinLendingServiceInterruptionBannerEnabledFlag
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

  it('should not display earnings history button when earn experience is STABLECOIN_LENDING', () => {
    (
      earnSelectors.selectEarnTokenPair as jest.MockedFunction<
        typeof earnSelectors.selectEarnTokenPair
      >
    ).mockReturnValue({
      earnToken: undefined,
      outputToken: {
        experience: {
          type: 'STABLECOIN_LENDING' as EARN_EXPERIENCES,
        },
      } as unknown as EarnTokenDetails,
    });

    const { getByText, queryByText } = render();

    expect(getByText(strings('stake.your_earnings'))).toBeDefined();
    expect(
      queryByText(strings('earn.view_earnings_history.lending')),
    ).toBeNull();
    expect(
      queryByText(strings('earn.view_earnings_history.staking')),
    ).toBeNull();
  });

  it('should navigate to lending learn more modal when earn experience is STABLECOIN_LENDING', async () => {
    const mockOutputToken = {
      chainId: '0x1',
      symbol: 'aWETH',
      address: '0x0',
      decimals: 18,
      image: '',
      name: '',
      aggregators: [],
      balance: '0',
      balanceFiat: '0',
      logo: '',
      isETH: false,
      experience: {
        type: 'STABLECOIN_LENDING' as EARN_EXPERIENCES,
      },
    };

    (
      earnSelectors.selectEarnTokenPair as jest.MockedFunction<
        typeof earnSelectors.selectEarnTokenPair
      >
    ).mockReturnValue({
      earnToken: undefined,
      outputToken: mockOutputToken as unknown as EarnTokenDetails,
    });

    const { getByText, getByTestId } = render();

    await act(async () => {
      fireEvent.press(getByTestId('annual-rate-tooltip'));
    });

    expect(getByText(strings('stake.your_earnings'))).toBeDefined();
    expect(mockNavigate).toHaveBeenCalledWith('EarnModals', {
      screen: Routes.EARN.MODALS.LENDING_LEARN_MORE,
      params: {
        asset: mockOutputToken,
      },
    });
  });

  it('should navigate to pooled staking learn more modal when earn experience is POOLED_STAKING', async () => {
    const mockOutputToken = {
      chainId: '0x1',
      symbol: 'aETH',
      address: '0x0',
      decimals: 18,
      image: '',
      name: '',
      aggregators: [],
      balance: '0',
      balanceFiat: '0',
      logo: '',
      isETH: true,
      experience: {
        type: 'POOLED_STAKING' as EARN_EXPERIENCES,
      },
    };

    (
      earnSelectors.selectEarnTokenPair as jest.MockedFunction<
        typeof earnSelectors.selectEarnTokenPair
      >
    ).mockReturnValue({
      earnToken: undefined,
      outputToken: mockOutputToken as unknown as EarnTokenDetails,
    });

    const { getByText, getByTestId } = render();

    await act(async () => {
      fireEvent.press(getByTestId('annual-rate-tooltip'));
    });

    expect(getByText(strings('stake.your_earnings'))).toBeDefined();
    expect(mockNavigate).toHaveBeenCalledWith('StakeModals', {
      screen: Routes.STAKING.MODALS.LEARN_MORE,
      params: {
        chainId: mockOutputToken.chainId,
      },
    });
  });
});
