import { act, fireEvent } from '@testing-library/react-native';
import React from 'react';
import EarnLendingBalance, { EARN_LENDING_BALANCE_TEST_IDS } from '.';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { earnSelectors } from '../../../../../selectors/earnController';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { createMockToken } from '../../../Stake/testUtils';
import { TokenI } from '../../../Tokens/types';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import {
  selectPooledStakingServiceInterruptionBannerEnabledFlag,
  selectStablecoinLendingEnabledFlag,
  selectStablecoinLendingServiceInterruptionBannerEnabledFlag,
} from '../../selectors/featureFlags';
import { EarnTokenDetails } from '../../types/lending.types';
import useStakingEligibility from '../../../Stake/hooks/useStakingEligibility';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { AnalyticsEventBuilder } from '../../../../../util/analytics/AnalyticsEventBuilder';

const mockNavigate = jest.fn();
const mockDaiMainnet: EarnTokenDetails = {
  ...createMockToken({
    symbol: 'DAI',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    chainId: '0x1',
    name: 'DAI',
    balance: '76.04796 DAI',
    balanceFiat: '$76.00',
  }),
  balanceFormatted: '76.04796 DAI',
  balanceMinimalUnit: '76047960000000000000',
  balanceFiatNumber: 76.0,
  tokenUsdExchangeRate: 1,
  experience: {
    type: EARN_EXPERIENCES.STABLECOIN_LENDING,
    apr: '5.2',
    estimatedAnnualRewardsFormatted: '3.95 DAI',
    estimatedAnnualRewardsFiatNumber: 3.95,
    estimatedAnnualRewardsTokenMinimalUnit: '3950000000000000000',
    estimatedAnnualRewardsTokenFormatted: '3.95 DAI',
  },
  experiences: [
    {
      type: EARN_EXPERIENCES.STABLECOIN_LENDING,
      apr: '5.2',
      estimatedAnnualRewardsFormatted: '3.95 DAI',
      estimatedAnnualRewardsFiatNumber: 3.95,
      estimatedAnnualRewardsTokenMinimalUnit: '3950000000000000000',
      estimatedAnnualRewardsTokenFormatted: '3.95 DAI',
    },
  ],
};
const mockADAIMainnet: EarnTokenDetails = {
  ...createMockToken({
    symbol: 'ADAI',
    address: '0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c',
    chainId: '0x1',
    name: 'ADAI',
    balance: '76.04796 ADAI',
    balanceFiat: '$76.00',
  }),
  balanceFormatted: '32.05 ADAI',
  balanceMinimalUnit: '32050000000000000000',
  balanceFiatNumber: 32.05,
  tokenUsdExchangeRate: 1,
  experience: {
    type: EARN_EXPERIENCES.STABLECOIN_LENDING,
    apr: '5.2',
    estimatedAnnualRewardsFormatted: '1.67 ADAI',
    estimatedAnnualRewardsFiatNumber: 1.67,
    estimatedAnnualRewardsTokenMinimalUnit: '1670000000000000000',
    estimatedAnnualRewardsTokenFormatted: '1.67 ADAI',
  },
  experiences: [
    {
      type: EARN_EXPERIENCES.STABLECOIN_LENDING,
      apr: '5.2',
      estimatedAnnualRewardsFormatted: '1.67 ADAI',
      estimatedAnnualRewardsFiatNumber: 1.67,
      estimatedAnnualRewardsTokenMinimalUnit: '1670000000000000000',
      estimatedAnnualRewardsTokenFormatted: '1.67 ADAI',
    },
  ],
};

jest.mock('../../../Stake/hooks/usePooledStakes', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({
    pooledStakes: [],
    isLoading: false,
    error: null,
  }),
}));

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

const mockTrackEvent = jest.fn();
jest.mock('../../../../hooks/useAnalytics/useAnalytics');

jest.mock('../../hooks/useEarnings', () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({
    annualRewardRate: '5.2',
    lifetimeRewards: '10.34 DAI',
    lifetimeRewardsFiat: '$10.34',
    estimatedAnnualEarnings: '10.34 ADAI',
    estimatedAnnualEarningsFiat: '$10.34',
    isLoadingEarningsData: false,
    hasEarnLendingPositions: true,
    hasEarnings: true,
  }),
}));

jest.mock('../../hooks/useEarnTokens');

jest.mock('../../../Stake/hooks/useStakingEligibility', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockUseStakingEligibility = useStakingEligibility as jest.MockedFunction<
  typeof useStakingEligibility
>;

jest.mock('../../selectors/featureFlags', () => ({
  selectPooledStakingEnabledFlag: jest.fn(),
  selectStablecoinLendingEnabledFlag: jest.fn(),
  selectStablecoinLendingServiceInterruptionBannerEnabledFlag: jest.fn(),
  selectPooledStakingServiceInterruptionBannerEnabledFlag: jest.fn(),
}));

jest.mock('../../../../../selectors/earnController', () => ({
  earnSelectors: {
    ...jest.requireActual('../../../../../selectors/earnController')
      .earnSelectors,
    selectEarnToken: jest
      .fn()
      .mockImplementation((_token: TokenI) => mockDaiMainnet),
    selectEarnOutputToken: jest.fn().mockReturnValue(undefined),
    selectEarnTokenPair: jest.fn().mockImplementation((_token: TokenI) => ({
      outputToken: mockADAIMainnet,
      earnToken: mockDaiMainnet,
    })),
  },
}));

jest.mock('../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(() => 'mainnet'),
      setActiveNetwork: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

describe('EarnLendingBalance', () => {
  const mockInitialState = {
    engine: {
      backgroundState,
    },
  };

  const useAnalyticsMock = jest.mocked(useAnalytics);

  beforeEach(() => {
    jest.clearAllMocks();

    useAnalyticsMock.mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: AnalyticsEventBuilder.createEventBuilder,
    } as unknown as ReturnType<typeof useAnalytics>);

    mockUseStakingEligibility.mockReturnValue({
      isEligible: true,
      isLoadingEligibility: false,
      error: null,
      refreshPooledStakingEligibility: jest.fn(),
    });

    (
      selectStablecoinLendingEnabledFlag as jest.MockedFunction<
        typeof selectStablecoinLendingEnabledFlag
      >
    ).mockReturnValue(true);
    (
      selectStablecoinLendingServiceInterruptionBannerEnabledFlag as jest.MockedFunction<
        typeof selectStablecoinLendingServiceInterruptionBannerEnabledFlag
      >
    ).mockReturnValue(false);

    (
      selectPooledStakingServiceInterruptionBannerEnabledFlag as jest.MockedFunction<
        typeof selectPooledStakingServiceInterruptionBannerEnabledFlag
      >
    ).mockReturnValue(false);
  });

  it('hides lending actions for underlying tokens', () => {
    const { queryByTestId, queryByText } = renderWithProvider(
      <EarnLendingBalance asset={mockDaiMainnet} />,
      { state: mockInitialState },
    );

    expect(queryByText(mockADAIMainnet.name)).not.toBeOnTheScreen();
    expect(
      queryByTestId(EARN_LENDING_BALANCE_TEST_IDS.WITHDRAW_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('renders lending earnings and withdraw action for receipt tokens', () => {
    (
      earnSelectors.selectEarnToken as jest.MockedFunction<
        typeof earnSelectors.selectEarnToken
      >
    ).mockReturnValueOnce(undefined);

    (
      earnSelectors.selectEarnOutputToken as jest.MockedFunction<
        typeof earnSelectors.selectEarnOutputToken
      >
    ).mockReturnValueOnce(mockADAIMainnet);

    (
      earnSelectors.selectEarnTokenPair as jest.MockedFunction<
        typeof earnSelectors.selectEarnTokenPair
      >
    ).mockReturnValueOnce({
      outputToken: mockADAIMainnet,
      earnToken: mockDaiMainnet,
    });

    const { getByTestId, getByText } = renderWithProvider(
      <EarnLendingBalance asset={mockADAIMainnet} />,
      { state: mockInitialState },
    );

    expect(getByText(strings('earn.lending_earnings'))).toBeOnTheScreen();
    expect(
      getByTestId(EARN_LENDING_BALANCE_TEST_IDS.WITHDRAW_BUTTON),
    ).toBeOnTheScreen();
  });

  it('hides lending earnings for receipt tokens without a position', () => {
    const emptyReceiptToken = {
      ...mockADAIMainnet,
      balanceMinimalUnit: '0',
    };
    (
      earnSelectors.selectEarnOutputToken as jest.MockedFunction<
        typeof earnSelectors.selectEarnOutputToken
      >
    ).mockReturnValue(emptyReceiptToken);
    (
      earnSelectors.selectEarnTokenPair as jest.MockedFunction<
        typeof earnSelectors.selectEarnTokenPair
      >
    ).mockReturnValue({
      outputToken: emptyReceiptToken,
      earnToken: mockDaiMainnet,
    });

    const { queryByTestId, queryByText } = renderWithProvider(
      <EarnLendingBalance asset={emptyReceiptToken} />,
      { state: mockInitialState },
    );

    expect(queryByText(strings('earn.lending_earnings'))).not.toBeOnTheScreen();
    expect(
      queryByTestId(EARN_LENDING_BALANCE_TEST_IDS.WITHDRAW_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('does not render when lending is disabled', () => {
    (
      selectStablecoinLendingEnabledFlag as jest.MockedFunction<
        typeof selectStablecoinLendingEnabledFlag
      >
    ).mockReturnValue(false);

    const { toJSON } = renderWithProvider(
      <EarnLendingBalance asset={mockDaiMainnet} />,
      { state: mockInitialState },
    );

    expect(toJSON()).toBeNull();
  });

  it('navigates to withdrawal screen when withdraw is pressed', async () => {
    (
      earnSelectors.selectEarnToken as jest.MockedFunction<
        typeof earnSelectors.selectEarnToken
      >
    ).mockReturnValue(mockDaiMainnet);

    (
      earnSelectors.selectEarnOutputToken as jest.MockedFunction<
        typeof earnSelectors.selectEarnOutputToken
      >
    ).mockReturnValue(mockADAIMainnet);

    (
      earnSelectors.selectEarnTokenPair as jest.MockedFunction<
        typeof earnSelectors.selectEarnTokenPair
      >
    ).mockReturnValue({
      outputToken: mockADAIMainnet,
      earnToken: mockDaiMainnet,
    });

    const { getByTestId } = renderWithProvider(
      <EarnLendingBalance asset={mockADAIMainnet} />,
      { state: mockInitialState },
    );

    const withdrawButton = getByTestId(
      EARN_LENDING_BALANCE_TEST_IDS.WITHDRAW_BUTTON,
    );

    await act(async () => {
      fireEvent.press(withdrawButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
      screen: Routes.STAKING.UNSTAKE,
      params: {
        token: mockADAIMainnet,
      },
    });
  });

  it('tracks EARN_LENDING_WITHDRAW_BUTTON_CLICKED when withdraw is pressed', async () => {
    (
      earnSelectors.selectEarnToken as jest.MockedFunction<
        typeof earnSelectors.selectEarnToken
      >
    ).mockReturnValue(mockDaiMainnet);

    (
      earnSelectors.selectEarnOutputToken as jest.MockedFunction<
        typeof earnSelectors.selectEarnOutputToken
      >
    ).mockReturnValue(mockADAIMainnet);

    (
      earnSelectors.selectEarnTokenPair as jest.MockedFunction<
        typeof earnSelectors.selectEarnTokenPair
      >
    ).mockReturnValue({
      outputToken: mockADAIMainnet,
      earnToken: mockDaiMainnet,
    });

    const { getByTestId } = renderWithProvider(
      <EarnLendingBalance asset={mockADAIMainnet} />,
      { state: mockInitialState },
    );

    const withdrawButton = getByTestId(
      EARN_LENDING_BALANCE_TEST_IDS.WITHDRAW_BUTTON,
    );

    await act(async () => {
      fireEvent.press(withdrawButton);
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Earn Lending Withdraw Button Clicked',
        properties: expect.objectContaining({
          action_type: 'withdrawal',
          token: 'DAI',
          user_earn_token_balance: '76.04796 DAI',
          user_receipt_token_balance: '32.05 ADAI',
          experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
        }),
      }),
    );
  });

  it('does renders earnings for output tokens', () => {
    (
      earnSelectors.selectEarnToken as jest.MockedFunction<
        typeof earnSelectors.selectEarnToken
      >
    ).mockReturnValue(mockDaiMainnet);

    (
      earnSelectors.selectEarnOutputToken as jest.MockedFunction<
        typeof earnSelectors.selectEarnOutputToken
      >
    ).mockReturnValue(mockADAIMainnet);

    (
      earnSelectors.selectEarnTokenPair as jest.MockedFunction<
        typeof earnSelectors.selectEarnTokenPair
      >
    ).mockReturnValue({
      outputToken: mockADAIMainnet,
      earnToken: mockDaiMainnet,
    });

    const { getByTestId } = renderWithProvider(
      <EarnLendingBalance asset={mockADAIMainnet} />,
      { state: mockInitialState },
    );

    expect(
      getByTestId(EARN_LENDING_BALANCE_TEST_IDS.WITHDRAW_BUTTON),
    ).toBeOnTheScreen();
  });
});
