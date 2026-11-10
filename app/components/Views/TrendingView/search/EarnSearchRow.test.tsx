import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Pressable as MockPressable } from 'react-native';
import { useSelector } from 'react-redux';
import EarnSearchRow from './EarnSearchRow';
import EarnMoneyAccountRow from '../feeds/earn/EarnMoneyAccountRow';
import EarnSearchAssetRow from '../feeds/earn/EarnSearchAssetRow';
import useEarnOpportunityNavigation, {
  getEarnAssetSelectionRedirectTarget,
} from '../../../UI/Earn/hooks/useEarnOpportunityNavigation';
import {
  useMoneyNavigation,
  type NavigateToMoneyHomeOptions,
} from '../../../UI/Money/hooks/useMoneyNavigation';
import { useMoneyAnalytics } from '../../../UI/Money/hooks/useMoneyAnalytics';
import {
  MONEY_BUTTON_INTENTS,
  SCREEN_NAMES,
} from '../../../UI/Money/constants/moneyEvents';
import { useEarnAnalytics } from '../../../UI/Earn/hooks/useEarnAnalytics';
import { selectMoneyCtaEntryContext } from '../../../UI/Money/selectors/entry';
import type { MoneyEntryContext } from '../../../UI/Money/navigation/moneyEntryDecision';
import {
  EARN_MODULE_COMPONENT_NAMES,
  EARN_MODULE_ENTRY_POINTS,
  EARN_MODULE_REDIRECT_TARGETS,
} from '../../../UI/Earn/constants/earnModuleEvents';
import { EARN_EXPERIENCES } from '../../../UI/Earn/constants/experiences';
import type { EarnAssetId } from '../../../UI/Earn/types/earnAssets';
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
  getEarnAssetSelectionRedirectTarget: jest.fn(() => 'token_details'),
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
    privacyMode,
  }: React.ComponentProps<typeof EarnMoneyAccountRow>) => (
    <MockPressable
      testID="money-row"
      accessibilityLabel={privacyMode ? 'privacy-on' : 'privacy-off'}
      onPress={() => onPress(item)}
    />
  ),
}));
jest.mock('../feeds/earn/EarnSearchAssetRow', () => ({
  __esModule: true,
  default: ({
    item,
    onPress,
    privacyMode,
  }: React.ComponentProps<typeof EarnSearchAssetRow>) => (
    <MockPressable
      testID="asset-row"
      accessibilityLabel={privacyMode ? 'privacy-on' : 'privacy-off'}
      onPress={() => onPress(item)}
    />
  ),
}));

const mockNavigateToMoneyHome = jest.fn();
const mockNavigateToMoneyHomeFromCta = jest.fn();
let mockMoneyEntryContext: MoneyEntryContext = {
  accessBlockReason: undefined,
  isOnboardingRedirectNeeded: false,
};
const mockNavigateFromEarnAsset = jest.fn();
const mockTrackMoneySurfaceClicked = jest.fn();
const mockTrackEarnSurfaceClicked = jest.fn();
const mockUseEarnAnalytics = jest.mocked(useEarnAnalytics);
const mockGetEarnAssetSelectionRedirectTarget = jest.mocked(
  getEarnAssetSelectionRedirectTarget,
);

const ASSET_ADDRESS = '0x0000000000000000000000000000000000000123';

const createEarnAsset = (): EarnSectionRankedAsset => ({
  assetId: `eip155:1/erc20:${ASSET_ADDRESS}` as EarnAssetId,
  metadata: {
    address: ASSET_ADDRESS,
    chainId: '0x1',
    decimals: 6,
    image: 'usdc.png',
    name: 'USD Coin',
    symbol: 'USDC',
    ticker: 'USDC',
    logo: 'usdc.png',
    isETH: false,
  },
  wallet: { status: 'untracked' },
  experiences: [
    {
      id: 'stablecoin-lending-usdc',
      type: EARN_EXPERIENCES.STABLECOIN_LENDING,
      role: 'underlying',
      depositReadiness: {
        status: 'not_ready',
        reason: 'asset_not_tracked',
      },
      rate: { type: 'APY', status: 'ready', percentage: 4.259 },
      isFeeSubsidized: true,
    },
  ],
  highestRatePercent: 4.259,
  highestRateExperience: {
    id: 'stablecoin-lending-usdc',
    type: EARN_EXPERIENCES.STABLECOIN_LENDING,
    role: 'underlying',
    depositReadiness: {
      status: 'not_ready',
      reason: 'asset_not_tracked',
    },
    rate: { type: 'APY', status: 'ready', percentage: 4.259 },
    isFeeSubsidized: true,
  },
  rateStatus: 'ready',
});

describe('EarnSearchRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMoneyEntryContext = {
      accessBlockReason: undefined,
      isOnboardingRedirectNeeded: false,
    };
    jest
      .mocked(useSelector)
      .mockImplementation((selector) =>
        selector === selectMoneyCtaEntryContext ? mockMoneyEntryContext : false,
      );
    const trackMoneyHomeEntry = (options: NavigateToMoneyHomeOptions = {}) => {
      options.track?.({
        redirect_target: mockMoneyEntryContext.isSplashRedirectNeeded
          ? SCREEN_NAMES.MONEY_SPLASH
          : mockMoneyEntryContext.isOnboardingRedirectNeeded
            ? SCREEN_NAMES.MONEY_ONBOARDING
            : SCREEN_NAMES.MONEY_HOME,
        button_intent: mockMoneyEntryContext.isSplashRedirectNeeded
          ? MONEY_BUTTON_INTENTS.GO_TO_MONEY_SPLASH
          : mockMoneyEntryContext.isOnboardingRedirectNeeded
            ? MONEY_BUTTON_INTENTS.GO_TO_MONEY_ONBOARDING
            : MONEY_BUTTON_INTENTS.GO_TO_MONEY_HOME,
      });
    };
    mockNavigateToMoneyHome.mockImplementation(trackMoneyHomeEntry);
    mockNavigateToMoneyHomeFromCta.mockImplementation(trackMoneyHomeEntry);
    jest.mocked(useMoneyNavigation).mockReturnValue({
      navigateToMoneyHome: mockNavigateToMoneyHome,
      navigateToMoneyHomeFromCta: mockNavigateToMoneyHomeFromCta,
    } as unknown as ReturnType<typeof useMoneyNavigation>);
    jest.mocked(useEarnOpportunityNavigation).mockReturnValue({
      navigateFromEarnAsset: mockNavigateFromEarnAsset,
      navigateToDepositForExperience: jest.fn(),
      resolveEarnDepositNavigationRoute: jest.fn(),
    });
    jest.mocked(useMoneyAnalytics).mockReturnValue({
      trackSurfaceClicked: mockTrackMoneySurfaceClicked,
    } as unknown as ReturnType<typeof useMoneyAnalytics>);
    jest.mocked(useEarnAnalytics).mockReturnValue({
      trackSurfaceClicked: mockTrackEarnSurfaceClicked,
    } as unknown as ReturnType<typeof useEarnAnalytics>);
    mockGetEarnAssetSelectionRedirectTarget.mockReturnValue(
      EARN_MODULE_REDIRECT_TARGETS.TOKEN_DETAILS,
    );
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
    expect(mockNavigateToMoneyHomeFromCta).toHaveBeenCalledWith({
      pop: false,
      track: expect.any(Function),
    });
  });

  it('tracks Earn surface ownership and preserves Explore search source', () => {
    const asset = createEarnAsset();
    const item = {
      kind: 'asset',
      id: asset.assetId,
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
        chain_id: 'formatted:0x1',
        asset_position: 2,
        assets_in_list: 3,
        eligible_strategy_count: 1,
        eligible_strategy_types: ['stablecoin_lending'],
        asset_has_balance: false,
        rate_percentage: 4.3,
        is_fee_subsidized: true,
        redirect_target: 'token_details',
      }),
    );
    expect(mockGetEarnAssetSelectionRedirectTarget).toHaveBeenCalledWith(
      item.asset,
      mockMoneyEntryContext,
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

  it.each([
    EARN_MODULE_REDIRECT_TARGETS.SWAP,
    EARN_MODULE_REDIRECT_TARGETS.BUY,
  ] as const)(
    'tracks alternate asset redirect target: %s',
    (redirectTarget) => {
      mockGetEarnAssetSelectionRedirectTarget.mockReturnValueOnce(
        redirectTarget,
      );
      const asset = createEarnAsset();
      const item = {
        kind: 'asset',
        id: asset.assetId,
        asset,
      } as const;

      const { getByTestId } = render(
        <EarnSearchRow item={item} position={1} resultCount={2} />,
      );

      fireEvent.press(getByTestId('asset-row'));

      expect(mockGetEarnAssetSelectionRedirectTarget).toHaveBeenCalledWith(
        item.asset,
        mockMoneyEntryContext,
      );
      expect(mockTrackEarnSurfaceClicked).toHaveBeenCalledWith(
        expect.objectContaining({
          redirect_target: redirectTarget,
        }),
      );
    },
  );

  it('tracks Money onboarding as destination for new users', () => {
    mockMoneyEntryContext = {
      accessBlockReason: undefined,
      isOnboardingRedirectNeeded: true,
    };

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

  it('tracks the splash as destination for unseen first-time users', () => {
    mockMoneyEntryContext = {
      accessBlockReason: undefined,
      isOnboardingRedirectNeeded: false,
      isSplashRedirectNeeded: true,
    };

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
      redirect_target: 'money_splash',
    });
    expect(mockNavigateToMoneyHomeFromCta).toHaveBeenCalledWith({
      pop: false,
      track: expect.any(Function),
    });
  });

  it('forwards privacy mode to the Money row', () => {
    jest.mocked(useSelector).mockReturnValue(true);
    const item = {
      kind: 'money-account',
      id: 'money-account',
      balanceRaw: '0',
      isBalanceLoading: false,
      rateStatus: 'ready',
    } as const;

    const { getByTestId } = render(
      <EarnSearchRow item={item} position={1} resultCount={1} />,
    );

    expect(getByTestId('money-row').props.accessibilityLabel).toBe(
      'privacy-on',
    );
  });

  it('forwards privacy mode to the Earn asset row', () => {
    jest.mocked(useSelector).mockReturnValue(true);
    const asset = createEarnAsset();
    const item = {
      kind: 'asset',
      id: asset.assetId,
      asset,
    } as const;

    const { getByTestId } = render(
      <EarnSearchRow item={item} position={1} resultCount={1} />,
    );

    expect(getByTestId('asset-row').props.accessibilityLabel).toBe(
      'privacy-on',
    );
  });
});
