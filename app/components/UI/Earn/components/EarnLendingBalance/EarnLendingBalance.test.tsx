import { act, fireEvent } from '@testing-library/react-native';
import React from 'react';
import EarnLendingBalance, { EARN_LENDING_BALANCE_TEST_IDS } from '.';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { earnSelectors } from '../../../../../selectors/earnController';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { createMockToken } from '../../../Stake/testUtils';
import { useTokenPricePercentageChange } from '../../../Tokens/hooks/useTokenPricePercentageChange';
import { TokenI } from '../../../Tokens/types';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import {
  selectPooledStakingEnabledFlag,
  selectPooledStakingServiceInterruptionBannerEnabledFlag,
  selectStablecoinLendingEnabledFlag,
  selectStablecoinLendingServiceInterruptionBannerEnabledFlag,
} from '../../selectors/featureFlags';
import { EarnTokenDetails } from '../../types/lending.types';
import { EARN_EMPTY_STATE_CTA_TEST_ID } from '../EmptyStateCta';

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
jest.mock('../../../Tokens/hooks/useTokenPricePercentageChange');

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

  beforeEach(() => {
    jest.clearAllMocks();
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

    (
      useTokenPricePercentageChange as jest.MockedFunction<
        typeof useTokenPricePercentageChange
      >
    ).mockReturnValue(5.2);
  });

  it('renders balance and buttons when user has lending positions', () => {
    const { toJSON, getByTestId } = renderWithProvider(
      <EarnLendingBalance asset={mockDaiMainnet} />,
      { state: mockInitialState },
    );

    expect(toJSON()).toMatchSnapshot();
    expect(
      getByTestId(
        EARN_LENDING_BALANCE_TEST_IDS.RECEIPT_TOKEN_BALANCE_ASSET_LOGO,
      ),
    ).toBeDefined();
    expect(
      getByTestId(EARN_LENDING_BALANCE_TEST_IDS.RECEIPT_TOKEN_LABEL),
    ).toBeDefined();
    expect(
      getByTestId(EARN_LENDING_BALANCE_TEST_IDS.WITHDRAW_BUTTON),
    ).toBeDefined();
    expect(
      getByTestId(EARN_LENDING_BALANCE_TEST_IDS.DEPOSIT_BUTTON),
    ).toBeDefined();
  });

  it('hides underlying token balance when asset prop is an output token', () => {
    (
      earnSelectors.selectEarnToken as jest.MockedFunction<
        typeof earnSelectors.selectEarnToken
      >
    ).mockReturnValue(undefined);

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

    const { getByTestId, queryByTestId } = renderWithProvider(
      <EarnLendingBalance asset={mockADAIMainnet} />,
      { state: mockInitialState },
    );

    // Hidden
    expect(
      queryByTestId(EARN_LENDING_BALANCE_TEST_IDS.RECEIPT_TOKEN_LABEL),
    ).toBeNull();
    expect(
      queryByTestId(
        EARN_LENDING_BALANCE_TEST_IDS.RECEIPT_TOKEN_BALANCE_ASSET_LOGO,
      ),
    ).toBeNull();

    // Still Rendering Buttons
    expect(
      getByTestId(EARN_LENDING_BALANCE_TEST_IDS.WITHDRAW_BUTTON),
    ).toBeDefined();
  });

  it('displays earn empty state cta when user has no lending positions', () => {
    const mockEmptyReceiptToken = {
      ...mockADAIMainnet,
      balanceMinimalUnit: '0',
      balanceFormatted: '0 ADAI',
      balanceFiatNumber: 0,
    };

    (
      earnSelectors.selectEarnToken as jest.MockedFunction<
        typeof earnSelectors.selectEarnToken
      >
    ).mockReturnValue(mockDaiMainnet);

    (
      earnSelectors.selectEarnOutputToken as jest.MockedFunction<
        typeof earnSelectors.selectEarnOutputToken
      >
    ).mockReturnValue(undefined);

    (
      earnSelectors.selectEarnTokenPair as jest.MockedFunction<
        typeof earnSelectors.selectEarnTokenPair
      >
    ).mockReturnValue({
      outputToken: mockEmptyReceiptToken,
      earnToken: mockDaiMainnet,
    });

    const { getByTestId, getByText } = renderWithProvider(
      <EarnLendingBalance asset={mockDaiMainnet} />,
      { state: mockInitialState },
    );

    expect(getByTestId(EARN_EMPTY_STATE_CTA_TEST_ID)).toBeDefined();
    expect(
      getByText(
        strings('earn.empty_state_cta.heading', {
          tokenSymbol: 'DAI',
        }),
      ),
    ).toBeDefined();
  });

  it('does not render if stablecoin lending feature flag disabled', () => {
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

  it('does render if pooled staking feature flag disabled', () => {
    (
      selectPooledStakingEnabledFlag as jest.MockedFunction<
        typeof selectPooledStakingEnabledFlag
      >
    ).mockReturnValue(false);

    const { toJSON } = renderWithProvider(
      <EarnLendingBalance asset={mockDaiMainnet} />,
      { state: mockInitialState },
    );

    expect(toJSON()).toBeDefined();
  });

  it('navigates to deposit screen when deposit more is pressed', async () => {
    (
      earnSelectors.selectEarnToken as jest.MockedFunction<
        typeof earnSelectors.selectEarnToken
      >
    ).mockReturnValue(mockDaiMainnet);

    (
      earnSelectors.selectEarnOutputToken as jest.MockedFunction<
        typeof earnSelectors.selectEarnOutputToken
      >
    ).mockReturnValue(undefined);

    (
      earnSelectors.selectEarnTokenPair as jest.MockedFunction<
        typeof earnSelectors.selectEarnTokenPair
      >
    ).mockReturnValue({
      outputToken: mockADAIMainnet,
      earnToken: mockDaiMainnet,
    });

    const { getByTestId } = renderWithProvider(
      <EarnLendingBalance asset={mockDaiMainnet} />,
      { state: mockInitialState },
    );

    const depositButton = getByTestId(
      EARN_LENDING_BALANCE_TEST_IDS.DEPOSIT_BUTTON,
    );

    await act(async () => {
      fireEvent.press(depositButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith('StakeScreens', {
      screen: Routes.STAKING.STAKE,
      params: {
        token: mockDaiMainnet,
      },
    });
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
      <EarnLendingBalance asset={mockDaiMainnet} />,
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

    const { toJSON } = renderWithProvider(
      <EarnLendingBalance asset={mockADAIMainnet} />,
      { state: mockInitialState },
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
