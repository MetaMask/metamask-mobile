import React, { act } from 'react';
import Earnings, { EARNINGS_TEST_IDS } from '.';
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
import { View } from 'react-native';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';

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

jest.mock('../../../../../selectors/preferencesController', () => ({
  ...jest.requireActual('../../../../../selectors/preferencesController'),
  selectPrivacyMode: jest.fn(),
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

const render = (state = STATE_MOCK, lendingAction?: React.ReactNode) =>
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
      lendingAction={lendingAction}
    />,
    {
      state,
    },
  );

describe('Earnings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (
      selectPrivacyMode as jest.MockedFunction<typeof selectPrivacyMode>
    ).mockReturnValue(false);
  });

  it('renders pooled-staking earnings', () => {
    const { getByText, queryByText } = render();

    expect(getByText(strings('stake.your_earnings'))).toBeOnTheScreen();
    expect(getByText(strings('stake.annual_rate'))).toBeOnTheScreen();
    expect(getByText(strings('stake.lifetime_rewards'))).toBeOnTheScreen();
    expect(
      getByText(strings('stake.estimated_annual_earnings')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('earn.view_earnings_history.staking')),
    ).toBeOnTheScreen();
    expect(
      queryByText(
        strings('earn.service_interruption_banner.maintenance_message'),
      ),
    ).not.toBeOnTheScreen();
  });

  it('displays pooled-staking earnings values when privacy mode is disabled', () => {
    const { getByTestId } = render();

    expect(
      getByTestId(EARNINGS_TEST_IDS.LIFETIME_EARNINGS_FIAT),
    ).toHaveTextContent('$5000');
    expect(
      getByTestId(EARNINGS_TEST_IDS.LIFETIME_EARNINGS_TOKEN),
    ).toHaveTextContent('2.5 ETH');
    expect(
      getByTestId(EARNINGS_TEST_IDS.ESTIMATED_ANNUAL_EARNINGS_FIAT),
    ).toHaveTextContent('$5000');
    expect(
      getByTestId(EARNINGS_TEST_IDS.ESTIMATED_ANNUAL_EARNINGS_TOKEN),
    ).toHaveTextContent('2.5 ETH');
  });

  it('masks pooled-staking earnings values in privacy mode', () => {
    (
      selectPrivacyMode as jest.MockedFunction<typeof selectPrivacyMode>
    ).mockReturnValue(true);

    const { getByTestId, queryByText } = render();

    expect(
      getByTestId(EARNINGS_TEST_IDS.LIFETIME_EARNINGS_FIAT),
    ).toHaveTextContent(/•/);
    expect(
      getByTestId(EARNINGS_TEST_IDS.LIFETIME_EARNINGS_TOKEN),
    ).toHaveTextContent(/•/);
    expect(
      getByTestId(EARNINGS_TEST_IDS.ESTIMATED_ANNUAL_EARNINGS_FIAT),
    ).toHaveTextContent(/•/);
    expect(
      getByTestId(EARNINGS_TEST_IDS.ESTIMATED_ANNUAL_EARNINGS_TOKEN),
    ).toHaveTextContent(/•/);
    expect(queryByText('$5000')).not.toBeOnTheScreen();
    expect(queryByText('2.5 ETH')).not.toBeOnTheScreen();
  });

  it('displays pooled-staking maintenance banner when feature flag is enabled', () => {
    (
      selectPooledStakingServiceInterruptionBannerEnabledFlag as jest.MockedFunction<
        typeof selectPooledStakingServiceInterruptionBannerEnabledFlag
      >
    ).mockReturnValue(true);

    const { getByText } = render();

    expect(
      getByText(
        strings('earn.service_interruption_banner.maintenance_message'),
      ),
    ).toBeOnTheScreen();
  });

  it('displays lending maintenance banner when feature flag is enabled', () => {
    (
      selectStablecoinLendingServiceInterruptionBannerEnabledFlag as jest.MockedFunction<
        typeof selectStablecoinLendingServiceInterruptionBannerEnabledFlag
      >
    ).mockReturnValue(true);

    const { getByText } = render();

    expect(
      getByText(
        strings('earn.service_interruption_banner.maintenance_message'),
      ),
    ).toBeOnTheScreen();
  });

  it('renders lending title and action without earnings history', () => {
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

    const { getByTestId, getByText, queryByText } = render(
      STATE_MOCK,
      <View testID="lending-action" />,
    );

    expect(getByText(strings('earn.lending_earnings'))).toBeOnTheScreen();
    expect(getByTestId('lending-action')).toBeOnTheScreen();
    expect(
      queryByText(strings('earn.view_earnings_history.lending')),
    ).not.toBeOnTheScreen();
    expect(
      queryByText(strings('earn.view_earnings_history.staking')),
    ).not.toBeOnTheScreen();
  });

  it('masks lending estimated annual earnings in privacy mode', () => {
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
      } as EarnTokenDetails,
    });
    (
      selectPrivacyMode as jest.MockedFunction<typeof selectPrivacyMode>
    ).mockReturnValue(true);

    const { getByTestId, queryByText } = render();

    expect(
      getByTestId(EARNINGS_TEST_IDS.ESTIMATED_ANNUAL_EARNINGS_FIAT),
    ).toHaveTextContent(/•/);
    expect(
      getByTestId(EARNINGS_TEST_IDS.ESTIMATED_ANNUAL_EARNINGS_TOKEN),
    ).toHaveTextContent(/•/);
    expect(queryByText('$5000')).not.toBeOnTheScreen();
    expect(queryByText('2.5 ETH')).not.toBeOnTheScreen();
  });

  it('navigates to lending learn more modal when earn experience is STABLECOIN_LENDING', async () => {
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

    expect(getByText(strings('earn.lending_earnings'))).toBeOnTheScreen();
    expect(mockNavigate).toHaveBeenCalledWith('EarnModals', {
      screen: Routes.EARN.MODALS.LENDING_LEARN_MORE,
      params: {
        asset: mockOutputToken,
      },
    });
  });

  it('navigates to pooled staking learn more modal when earn experience is POOLED_STAKING', async () => {
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

    expect(getByText(strings('stake.your_earnings'))).toBeOnTheScreen();
    expect(mockNavigate).toHaveBeenCalledWith('StakeModals', {
      screen: Routes.STAKING.MODALS.LEARN_MORE,
      params: {
        chainId: mockOutputToken.chainId,
      },
    });
  });
});
