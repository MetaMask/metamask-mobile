import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Pressable as MockPressable } from 'react-native';
import { useSelector } from 'react-redux';
import EarnSearchRow from './EarnSearchRow';
import EarnMoneyAccountRow from '../feeds/earn/EarnMoneyAccountRow';
import EarnSearchAssetRow from '../feeds/earn/EarnSearchAssetRow';
import useEarnOpportunityNavigation from '../../../UI/Earn/hooks/useEarnOpportunityNavigation';
import { useMoneyNavigation } from '../../../UI/Money/hooks/useMoneyNavigation';
import { useMoneyAnalytics } from '../../../UI/Money/hooks/useMoneyAnalytics';
import { useEarnAnalytics } from '../../../UI/Earn/hooks/useEarnAnalytics';
import {
  EARN_MODULE_COMPONENT_NAMES,
  EARN_MODULE_ENTRY_POINTS,
} from '../../../UI/Earn/constants/earnModuleEvents';
import { EARN_EXPERIENCES } from '../../../UI/Earn/constants/experiences';
import type { EarnSectionRankedAsset } from '../../../UI/Earn/utils/earnSection';
import { TokenDetailsSource } from '../../../UI/TokenDetails/constants/constants';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => false),
}));
jest.mock('../../../UI/Money/hooks/useMoneyNavigation', () => ({
  useMoneyNavigation: jest.fn(),
}));
jest.mock('../../../UI/Money/hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: jest.fn(),
}));
jest.mock('../../../UI/Earn/hooks/useEarnOpportunityNavigation', () => ({
  __esModule: true,
  default: jest.fn(),
  getEarnOpportunityRedirectTarget: jest.fn(() => 'token_details'),
}));
jest.mock('../../../UI/Earn/hooks/useEarnAnalytics', () => ({
  useEarnAnalytics: jest.fn(),
}));
jest.mock('../../../UI/Earn/utils/analytics', () => ({
  formatChainIdForAnalytics: jest.fn((chainId?: string | number) =>
    chainId === undefined ? undefined : `formatted:${chainId}`,
  ),
}));
jest.mock('../feeds/earn/EarnMoneyAccountRow', () => ({
  __esModule: true,
  default: ({
    item,
    onPress,
  }: React.ComponentProps<typeof EarnMoneyAccountRow>) => (
    <MockPressable testID="money-row" onPress={() => onPress(item)} />
  ),
}));
jest.mock('../feeds/earn/EarnSearchAssetRow', () => ({
  __esModule: true,
  default: ({
    item,
    onPress,
  }: React.ComponentProps<typeof EarnSearchAssetRow>) => (
    <MockPressable testID="asset-row" onPress={() => onPress(item)} />
  ),
}));

const mockNavigateToMoneyHome = jest.fn();
let mockIsOnboardingRedirectNeeded = false;
const mockNavigateFromEarnAsset = jest.fn();
const mockTrackMoneySurfaceClicked = jest.fn();
const mockTrackEarnSurfaceClicked = jest.fn();
const mockUseEarnAnalytics = jest.mocked(useEarnAnalytics);

const createEarnAsset = (): EarnSectionRankedAsset => ({
  kind: 'discovery',
  assetId: 'eip155:1/erc20:0x123',
  metadata: {
    address: '0x123',
    chainId: '1',
    decimals: 6,
    image: 'usdc.png',
    name: 'USD Coin',
    symbol: 'USDC',
    ticker: 'USDC',
    logo: 'usdc.png',
    isETH: false,
  },
  experiences: [
    {
      id: 'stablecoin-lending-usdc',
      type: EARN_EXPERIENCES.STABLECOIN_LENDING,
      role: 'underlying',
      rate: { type: 'APY', status: 'ready', percentage: 4.259 },
      isFeeSubsidized: true,
    },
  ],
  highestRatePercent: 4.259,
  highestRateExperience: {
    id: 'stablecoin-lending-usdc',
    type: EARN_EXPERIENCES.STABLECOIN_LENDING,
    role: 'underlying',
    rate: { type: 'APY', status: 'ready', percentage: 4.259 },
    isFeeSubsidized: true,
  },
  rateStatus: 'ready',
});

describe('EarnSearchRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsOnboardingRedirectNeeded = false;
    jest.mocked(useSelector).mockReturnValue(false);
    jest.mocked(useMoneyNavigation).mockReturnValue({
      isOnboardingRedirectNeeded: mockIsOnboardingRedirectNeeded,
      navigateToMoneyHome: mockNavigateToMoneyHome,
    } as unknown as ReturnType<typeof useMoneyNavigation>);
    jest.mocked(useEarnOpportunityNavigation).mockReturnValue({
      navigateFromEarnAsset: mockNavigateFromEarnAsset,
      navigateToDepositForExperience: jest.fn(),
    });
    jest.mocked(useMoneyAnalytics).mockReturnValue({
      trackSurfaceClicked: mockTrackMoneySurfaceClicked,
    } as unknown as ReturnType<typeof useMoneyAnalytics>);
    jest.mocked(useEarnAnalytics).mockReturnValue({
      trackSurfaceClicked: mockTrackEarnSurfaceClicked,
    } as unknown as ReturnType<typeof useEarnAnalytics>);
  });

  it('tracks Money surface ownership and onboarding target', () => {
    const item = {
      kind: 'money-account',
      id: 'money-account',
      balanceRaw: '0',
      isBalanceLoading: false,
      rateStatus: 'ready',
    } as const;

    const { getByTestId } = render(
      <EarnSearchRow item={item} position={1} resultCount={3} />,
    );

    fireEvent.press(getByTestId('money-row'));

    expect(mockTrackMoneySurfaceClicked).toHaveBeenCalledWith({
      redirect_target: 'money_home',
    });
    expect(mockUseEarnAnalytics).toHaveBeenCalledWith({
      component_name: EARN_MODULE_COMPONENT_NAMES.EARN_SEARCH_ROW,
      screen_name: 'explore_search',
      entry_point: EARN_MODULE_ENTRY_POINTS.EXPLORE_SEARCH,
    });
    expect(mockNavigateToMoneyHome).toHaveBeenCalledWith({ pop: false });
  });

  it('tracks Earn surface ownership and preserves Explore search source', () => {
    const asset = createEarnAsset();
    const item = {
      kind: 'asset',
      id: 'eip155:1/erc20:usdc',
      asset,
    } as const;

    const { getByTestId } = render(
      <EarnSearchRow item={item} position={2} resultCount={3} />,
    );

    fireEvent.press(getByTestId('asset-row'));

    expect(mockTrackEarnSurfaceClicked).toHaveBeenCalledWith(
      expect.objectContaining({
        component_name: EARN_MODULE_COMPONENT_NAMES.EARN_SEARCH_ASSET_ROW,
        asset_symbol: 'USDC',
        chain_id: 'formatted:1',
        asset_position: 2,
        assets_in_list: 3,
        eligible_strategy_count: 1,
        eligible_strategy_types: ['stablecoin_lending'],
        asset_has_balance: false,
        rate_percentage: 4.25,
        is_fee_subsidized: true,
        redirect_target: 'token_details',
      }),
    );
    expect(mockNavigateFromEarnAsset).toHaveBeenCalledWith(
      item.asset,
      TokenDetailsSource.ExploreSearch,
      {
        entry_point: 'explore_search',
        screen_name: 'explore_search',
        asset_position: 2,
        assets_in_list: 3,
      },
    );
  });

  it('tracks Money onboarding as destination for new users', () => {
    mockIsOnboardingRedirectNeeded = true;
    jest.mocked(useMoneyNavigation).mockReturnValue({
      isOnboardingRedirectNeeded: true,
      navigateToMoneyHome: mockNavigateToMoneyHome,
    } as unknown as ReturnType<typeof useMoneyNavigation>);

    const item = {
      kind: 'money-account',
      id: 'money-account',
      balanceRaw: '0',
      isBalanceLoading: false,
      rateStatus: 'ready',
    } as const;

    const { getByTestId } = render(
      <EarnSearchRow item={item} position={1} resultCount={3} />,
    );

    fireEvent.press(getByTestId('money-row'));

    expect(mockTrackMoneySurfaceClicked).toHaveBeenCalledWith({
      redirect_target: 'money_onboarding',
    });
  });
});
