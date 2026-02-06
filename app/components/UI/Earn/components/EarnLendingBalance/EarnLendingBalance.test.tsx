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
import { useMusdCtaVisibility } from '../../hooks/useMusdCtaVisibility';
import {
  selectIsMusdConversionFlowEnabledFlag,
  selectPooledStakingEnabledFlag,
  selectPooledStakingServiceInterruptionBannerEnabledFlag,
  selectStablecoinLendingEnabledFlag,
  selectStablecoinLendingServiceInterruptionBannerEnabledFlag,
} from '../../selectors/featureFlags';
import { EarnTokenDetails } from '../../types/lending.types';
import { EARN_EMPTY_STATE_CTA_TEST_ID } from '../EmptyStateCta';
import { useMusdConversionTokens } from '../../hooks/useMusdConversionTokens';
import { EARN_TEST_IDS } from '../../constants/testIds';
import useStakingEligibility from '../../../Stake/hooks/useStakingEligibility';

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
jest.mock('../../hooks/useMusdCtaVisibility', () => ({
  __esModule: true,
  useMusdCtaVisibility: jest.fn(),
}));

jest.mock('../../hooks/useMusdConversionTokens', () => ({
  __esModule: true,
  useMusdConversionTokens: jest.fn().mockReturnValue({
    isConversionToken: jest.fn().mockReturnValue(false),
    isTokenWithCta: jest.fn().mockReturnValue(false),
    filterAllowedTokens: jest.fn().mockReturnValue([]),
    tokens: [],
    tokensWithCTAs: [],
  }),
}));

jest.mock('../../../Stake/hooks/useStakingEligibility', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockUseStakingEligibility = useStakingEligibility as jest.MockedFunction<
  typeof useStakingEligibility
>;

jest.mock('../../hooks/useMusdConversionEligibility', () => ({
  useMusdConversionEligibility: jest.fn().mockReturnValue({
    isEligible: true,
    isLoading: false,
    geolocation: 'US',
    blockedCountries: [],
  }),
}));

jest.mock('../../selectors/featureFlags', () => ({
  selectIsMusdConversionFlowEnabledFlag: jest.fn(),
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
  let mockShouldShowAssetOverviewCta: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseStakingEligibility.mockReturnValue({
      isEligible: true,
      isLoadingEligibility: false,
      error: null,
      refreshPooledStakingEligibility: jest.fn(),
    });

    mockShouldShowAssetOverviewCta = jest.fn().mockReturnValue(false);
    (
      useMusdCtaVisibility as jest.MockedFunction<typeof useMusdCtaVisibility>
    ).mockReturnValue({
      shouldShowBuyGetMusdCta: jest.fn(),
      shouldShowTokenListItemCta: jest.fn(),
      shouldShowAssetOverviewCta: mockShouldShowAssetOverviewCta,
    });

    (
      selectIsMusdConversionFlowEnabledFlag as jest.MockedFunction<
        typeof selectIsMusdConversionFlowEnabledFlag
      >
    ).mockReturnValue(false);

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

  it('renders withdraw button and hides deposit button when user is not eligible', () => {
    mockUseStakingEligibility.mockReturnValue({
      isEligible: false,
      isLoadingEligibility: false,
      error: null,
      refreshPooledStakingEligibility: jest.fn(),
    });

    const { getByTestId, queryByTestId } = renderWithProvider(
      <EarnLendingBalance asset={mockDaiMainnet} />,
      { state: mockInitialState },
    );

    expect(
      getByTestId(EARN_LENDING_BALANCE_TEST_IDS.WITHDRAW_BUTTON),
    ).toBeDefined();
    expect(
      queryByTestId(EARN_LENDING_BALANCE_TEST_IDS.DEPOSIT_BUTTON),
    ).toBeNull();
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

  it('does not display earn empty state cta when user is not eligible', () => {
    const mockEmptyReceiptToken = {
      ...mockADAIMainnet,
      balanceMinimalUnit: '0',
      balanceFormatted: '0 ADAI',
      balanceFiatNumber: 0,
    };

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

    mockUseStakingEligibility.mockReturnValue({
      isEligible: false,
      isLoadingEligibility: false,
      error: null,
      refreshPooledStakingEligibility: jest.fn(),
    });

    const { queryByTestId } = renderWithProvider(
      <EarnLendingBalance asset={mockDaiMainnet} />,
      { state: mockInitialState },
    );

    expect(queryByTestId(EARN_EMPTY_STATE_CTA_TEST_ID)).toBeNull();
  });

  it('does not render when lending is disabled and token is not mUSD convertible', () => {
    (
      selectStablecoinLendingEnabledFlag as jest.MockedFunction<
        typeof selectStablecoinLendingEnabledFlag
      >
    ).mockReturnValue(false);

    (
      selectIsMusdConversionFlowEnabledFlag as jest.MockedFunction<
        typeof selectIsMusdConversionFlowEnabledFlag
      >
    ).mockReturnValue(false);

    (
      useMusdConversionTokens as jest.MockedFunction<
        typeof useMusdConversionTokens
      >
    ).mockReturnValue({
      isConversionToken: jest.fn().mockReturnValue(false),
      filterAllowedTokens: jest.fn().mockReturnValue([]),
      isMusdSupportedOnChain: jest.fn().mockReturnValue(false),
      tokens: [],
    });

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

  it('hides mUSD conversion CTA when feature flag is disabled', () => {
    (
      selectIsMusdConversionFlowEnabledFlag as jest.MockedFunction<
        typeof selectIsMusdConversionFlowEnabledFlag
      >
    ).mockReturnValue(false);

    (
      useMusdConversionTokens as jest.MockedFunction<
        typeof useMusdConversionTokens
      >
    ).mockReturnValue({
      isConversionToken: jest.fn().mockReturnValue(true),
      filterAllowedTokens: jest.fn().mockReturnValue([]),
      isMusdSupportedOnChain: jest.fn().mockReturnValue(true),
      tokens: [],
    });

    const { queryByTestId } = renderWithProvider(
      <EarnLendingBalance asset={mockDaiMainnet} />,
      { state: mockInitialState },
    );

    expect(
      queryByTestId(EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA),
    ).toBeNull();
  });

  it('hides mUSD conversion CTA when asset is not a conversion token', () => {
    (
      selectIsMusdConversionFlowEnabledFlag as jest.MockedFunction<
        typeof selectIsMusdConversionFlowEnabledFlag
      >
    ).mockReturnValue(true);

    (
      useMusdConversionTokens as jest.MockedFunction<
        typeof useMusdConversionTokens
      >
    ).mockReturnValue({
      isConversionToken: jest.fn().mockReturnValue(false),
      filterAllowedTokens: jest.fn().mockReturnValue([]),
      isMusdSupportedOnChain: jest.fn().mockReturnValue(true),
      tokens: [],
    });

    const { queryByTestId } = renderWithProvider(
      <EarnLendingBalance asset={mockDaiMainnet} />,
      { state: mockInitialState },
    );

    expect(
      queryByTestId(EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA),
    ).toBeNull();
  });

  it('displays mUSD conversion CTA when lending flag is disabled but mUSD conversion flag is enabled', () => {
    (
      selectStablecoinLendingEnabledFlag as jest.MockedFunction<
        typeof selectStablecoinLendingEnabledFlag
      >
    ).mockReturnValue(false);

    (
      selectIsMusdConversionFlowEnabledFlag as jest.MockedFunction<
        typeof selectIsMusdConversionFlowEnabledFlag
      >
    ).mockReturnValue(true);

    (
      useMusdConversionTokens as jest.MockedFunction<
        typeof useMusdConversionTokens
      >
    ).mockReturnValue({
      isConversionToken: jest.fn().mockReturnValue(true),
      filterAllowedTokens: jest.fn().mockReturnValue([]),
      isMusdSupportedOnChain: jest.fn().mockReturnValue(true),
      tokens: [],
    });

    mockShouldShowAssetOverviewCta.mockReturnValue(true);

    const { getByTestId } = renderWithProvider(
      <EarnLendingBalance asset={mockDaiMainnet} />,
      { state: mockInitialState },
    );

    expect(
      getByTestId(EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA),
    ).toBeOnTheScreen();
  });

  it('favors mUSD conversion CTA over lending empty state CTA when both conditions are met', () => {
    const mockEmptyReceiptToken = {
      ...mockADAIMainnet,
      balanceMinimalUnit: '0',
      balanceFormatted: '0 ADAI',
      balanceFiatNumber: 0,
    };

    (
      selectIsMusdConversionFlowEnabledFlag as jest.MockedFunction<
        typeof selectIsMusdConversionFlowEnabledFlag
      >
    ).mockReturnValue(true);

    (
      useMusdConversionTokens as jest.MockedFunction<
        typeof useMusdConversionTokens
      >
    ).mockReturnValue({
      isConversionToken: jest.fn().mockReturnValue(true),
      filterAllowedTokens: jest.fn().mockReturnValue([]),
      isMusdSupportedOnChain: jest.fn().mockReturnValue(true),
      tokens: [],
    });

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

    mockShouldShowAssetOverviewCta.mockReturnValue(true);

    const { getByTestId, queryByTestId } = renderWithProvider(
      <EarnLendingBalance asset={mockDaiMainnet} />,
      { state: mockInitialState },
    );

    expect(
      getByTestId(EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA),
    ).toBeOnTheScreen();
    expect(queryByTestId(EARN_EMPTY_STATE_CTA_TEST_ID)).toBeNull();
  });

  it('updates user state when close button is pressed on mUSD CTA', async () => {
    (
      selectStablecoinLendingEnabledFlag as jest.MockedFunction<
        typeof selectStablecoinLendingEnabledFlag
      >
    ).mockReturnValue(false);

    (
      selectIsMusdConversionFlowEnabledFlag as jest.MockedFunction<
        typeof selectIsMusdConversionFlowEnabledFlag
      >
    ).mockReturnValue(true);

    (
      useMusdConversionTokens as jest.MockedFunction<
        typeof useMusdConversionTokens
      >
    ).mockReturnValue({
      isConversionToken: jest.fn().mockReturnValue(true),
      filterAllowedTokens: jest.fn().mockReturnValue([]),
      isMusdSupportedOnChain: jest.fn().mockReturnValue(true),
      tokens: [],
    });

    mockShouldShowAssetOverviewCta.mockReturnValue(true);

    const { getByTestId, store } = renderWithProvider(
      <EarnLendingBalance asset={mockDaiMainnet} />,
      { state: mockInitialState },
    );

    const closeButton = getByTestId(
      EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA_CLOSE_BUTTON,
    );

    await act(async () => {
      fireEvent.press(closeButton);
    });

    const expectedCtaKey = '0x1-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
    const updatedState = store.getState();

    expect(
      updatedState.user.musdConversionAssetDetailCtasSeen[expectedCtaKey],
    ).toBe(true);
  });

  it('hides mUSD conversion CTA when user is geo-blocked', () => {
    const mockEmptyReceiptToken = {
      ...mockADAIMainnet,
      balanceMinimalUnit: '0',
      balanceFormatted: '0 ADAI',
      balanceFiatNumber: 0,
    };

    (
      earnSelectors.selectEarnTokenPair as jest.MockedFunction<
        typeof earnSelectors.selectEarnTokenPair
      >
    ).mockReturnValue({
      outputToken: mockEmptyReceiptToken,
      earnToken: mockDaiMainnet,
    });

    // Geo-blocked: shouldShowAssetOverviewCta returns false
    mockShouldShowAssetOverviewCta.mockReturnValue(false);

    const { queryByTestId } = renderWithProvider(
      <EarnLendingBalance asset={mockDaiMainnet} />,
      { state: mockInitialState },
    );

    // mUSD CTA hidden because geo-blocked (useMusdCtaVisibility returns false)
    expect(
      queryByTestId(EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA),
    ).toBeNull();
  });

  it('shows mUSD conversion CTA when user is geo-eligible', () => {
    const mockEmptyReceiptToken = {
      ...mockADAIMainnet,
      balanceMinimalUnit: '0',
      balanceFormatted: '0 ADAI',
      balanceFiatNumber: 0,
    };

    (
      earnSelectors.selectEarnTokenPair as jest.MockedFunction<
        typeof earnSelectors.selectEarnTokenPair
      >
    ).mockReturnValue({
      outputToken: mockEmptyReceiptToken,
      earnToken: mockDaiMainnet,
    });

    (
      selectStablecoinLendingEnabledFlag as jest.MockedFunction<
        typeof selectStablecoinLendingEnabledFlag
      >
    ).mockReturnValue(false);

    (
      selectIsMusdConversionFlowEnabledFlag as jest.MockedFunction<
        typeof selectIsMusdConversionFlowEnabledFlag
      >
    ).mockReturnValue(true);

    // Geo-eligible: shouldShowAssetOverviewCta returns true
    mockShouldShowAssetOverviewCta.mockReturnValue(true);

    const { getByTestId } = renderWithProvider(
      <EarnLendingBalance asset={mockDaiMainnet} />,
      { state: mockInitialState },
    );
    // mUSD CTA visible because geo-eligible (useMusdCtaVisibility returns true)
    expect(
      getByTestId(EARN_TEST_IDS.MUSD.ASSET_OVERVIEW_CONVERSION_CTA),
    ).toBeOnTheScreen();
  });
});
