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
jest.mock('../../../UI/Earn/utils/earnModuleAnalytics', () => ({
  getEarnModuleAnalyticsContext: jest.fn(() => ({
    entry_point: 'explore_search',
  })),
  getEarnModuleAssetProperties: jest.fn(() => ({
    asset_symbol: 'USDC',
  })),
}));
jest.mock('../feeds/earn/EarnMoneyAccountRow', () => ({
  __esModule: true,
  default: ({ onPress }: React.ComponentProps<typeof EarnMoneyAccountRow>) => (
    <MockPressable testID="money-row" onPress={() => onPress({} as never)} />
  ),
}));
jest.mock('../feeds/earn/EarnSearchAssetRow', () => ({
  __esModule: true,
  default: ({ onPress }: React.ComponentProps<typeof EarnSearchAssetRow>) => (
    <MockPressable testID="asset-row" onPress={() => onPress({} as never)} />
  ),
}));

const mockNavigateToMoneyHome = jest.fn();
let mockIsOnboardingRedirectNeeded = false;
const mockNavigateFromEarnAsset = jest.fn();
const mockTrackMoneySurfaceClicked = jest.fn();
const mockTrackEarnSurfaceClicked = jest.fn();
const mockUseEarnAnalytics = jest.mocked(useEarnAnalytics);

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
      component_name: EARN_MODULE_COMPONENT_NAMES.EARCH_SEARCH_ROW,
      entry_point: EARN_MODULE_ENTRY_POINTS.EXPLORE_SEARCH,
    });
    expect(mockNavigateToMoneyHome).toHaveBeenCalledWith({ pop: false });
  });

  it('tracks Earn surface ownership and preserves Explore search source', () => {
    const item = {
      kind: 'asset',
      id: 'eip155:1/erc20:usdc',
      asset: {} as never,
    } as const;

    const { getByTestId } = render(
      <EarnSearchRow item={item} position={2} resultCount={3} />,
    );

    fireEvent.press(getByTestId('asset-row'));

    expect(mockTrackEarnSurfaceClicked).toHaveBeenCalledWith(
      expect.objectContaining({
        component_name: EARN_MODULE_COMPONENT_NAMES.EARN_SEARCH_ASSET_ROW,
        asset_symbol: 'USDC',
        redirect_target: 'token_details',
      }),
    );
    expect(mockNavigateFromEarnAsset).toHaveBeenCalledWith(
      item.asset,
      TokenDetailsSource.ExploreSearch,
      expect.objectContaining({ entry_point: 'explore_search' }),
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
