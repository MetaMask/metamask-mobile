import React from 'react';
import StakingEarnings, { STAKING_EARNINGS_TEST_IDS } from '.';
import { fireEvent } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { mockNetworkState } from '../../../../../util/test/network';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { EARN_EXPERIENCES } from '../../../Earn/constants/experiences';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import Routes from '../../../../../constants/navigation/Routes';

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
}));

jest.mock('../../../../../selectors/preferencesController', () => ({
  ...jest.requireActual('../../../../../selectors/preferencesController'),
  selectPrivacyMode: jest.fn(),
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
  beforeEach(() => {
    jest.clearAllMocks();
    (
      selectPrivacyMode as jest.MockedFunction<typeof selectPrivacyMode>
    ).mockReturnValue(false);
  });

  it('renders pooled-staking earnings', () => {
    const { getByText, queryByText } = render();

    expect(getByText(strings('stake.staking'))).toBeOnTheScreen();
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
    ).toBeNull();
  });

  it('displays pooled-staking earnings values when privacy mode is disabled', () => {
    const { getByTestId } = render();

    expect(
      getByTestId(STAKING_EARNINGS_TEST_IDS.LIFETIME_EARNINGS_FIAT),
    ).toHaveTextContent('$5000');
    expect(
      getByTestId(STAKING_EARNINGS_TEST_IDS.LIFETIME_EARNINGS_TOKEN),
    ).toHaveTextContent('2.5 ETH');
    expect(
      getByTestId(STAKING_EARNINGS_TEST_IDS.ESTIMATED_ANNUAL_EARNINGS_FIAT),
    ).toHaveTextContent('$5000');
    expect(
      getByTestId(STAKING_EARNINGS_TEST_IDS.ESTIMATED_ANNUAL_EARNINGS_TOKEN),
    ).toHaveTextContent('2.5 ETH');
  });

  it('masks pooled-staking earnings values in privacy mode', () => {
    (
      selectPrivacyMode as jest.MockedFunction<typeof selectPrivacyMode>
    ).mockReturnValue(true);

    const { getByTestId, queryByText } = render();

    expect(
      getByTestId(STAKING_EARNINGS_TEST_IDS.LIFETIME_EARNINGS_FIAT),
    ).toHaveTextContent(/•/);
    expect(
      getByTestId(STAKING_EARNINGS_TEST_IDS.LIFETIME_EARNINGS_TOKEN),
    ).toHaveTextContent(/•/);
    expect(
      getByTestId(STAKING_EARNINGS_TEST_IDS.ESTIMATED_ANNUAL_EARNINGS_FIAT),
    ).toHaveTextContent(/•/);
    expect(
      getByTestId(STAKING_EARNINGS_TEST_IDS.ESTIMATED_ANNUAL_EARNINGS_TOKEN),
    ).toHaveTextContent(/•/);
    expect(queryByText('$5000')).not.toBeOnTheScreen();
    expect(queryByText('2.5 ETH')).not.toBeOnTheScreen();
  });

  it('navigates to the pooled-staking learn more modal when annual rate is pressed', () => {
    const { getByTestId } = render();

    fireEvent.press(
      getByTestId(STAKING_EARNINGS_TEST_IDS.ANNUAL_RATE_PRESSABLE),
    );

    expect(mockNavigate).toHaveBeenCalledWith('StakeModals', {
      screen: Routes.STAKING.MODALS.LEARN_MORE,
      params: { chainId: '0x1' },
    });
  });
});
