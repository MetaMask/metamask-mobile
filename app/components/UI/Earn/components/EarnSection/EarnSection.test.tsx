import React, { createRef } from 'react';
import type { Asset } from '@metamask/assets-controllers';
import { EthAccountType } from '@metamask/keyring-api';
import {
  act,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import {
  Icon,
  IconColor,
  IconName,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import useMoneyAccountBalance from '../../../Money/hooks/useMoneyAccountBalance';
import { selectIsMoneyAccountVisible } from '../../../Money/selectors/visibility';
import { useMoneyNavigation } from '../../../Money/hooks/useMoneyNavigation';
import useEarnSectionAssets from '../../hooks/useEarnSectionAssets';
import useEarnOpportunityNavigation from '../../hooks/useEarnOpportunityNavigation';
import { useEarnAnalytics } from '../../hooks/useEarnAnalytics';
import useHomeViewedEvent, {
  HomeSectionNames,
} from '../../../../Views/Homepage/hooks/useHomeViewedEvent';
import { useSectionPerformance } from '../../../../Views/Homepage/hooks/useSectionPerformance';
import { TokenDetailsSource } from '../../../TokenDetails/constants/constants';
import type { SectionRefreshHandle } from '../../../../Views/Homepage/types';
import type { EarnAssetId } from '../../types/earnAssets';
import type { EarnSectionRankedAsset } from '../../utils/earnSection';
import { EARN_EXPERIENCES } from '../../constants/experiences';
import {
  EARN_MODULE_COMPONENT_NAMES,
  EARN_MODULE_ENTRY_POINTS,
  EARN_MODULE_SCREEN_NAMES,
} from '../../constants/earnModuleEvents';
import EarnSection, { resetEarnSectionRefreshForTests } from './EarnSection';
import { EarnSectionTestIds } from './EarnSection.testIds';
import HomepageEarnSection from '../../../../Views/Homepage/Sections/EarnSection/HomepageEarnSection';
import { homepageSectionTitleTestId } from '../../../../Views/Homepage/Homepage.testIds';
import Logger from '../../../../../util/Logger';

const mockEarnTrackButtonClicked = jest.fn();
const mockEarnTrackComponentViewed = jest.fn();
const mockEarnTrackSurfaceClicked = jest.fn();
const mockMoneyTrackSurfaceClicked = jest.fn();
const mockNavigateToMoneyHome = jest.fn();

jest.mock('@react-navigation/native');
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));
jest.mock('@metamask/design-system-twrnc-preset');
jest.mock('../../../../UI/Earn/hooks/useEarnSectionAssets');
jest.mock('../../../../UI/Earn/hooks/useEarnOpportunityNavigation', () => ({
  __esModule: true,
  default: jest.fn(),
  getEarnOpportunityRedirectTarget: jest.fn(() => 'stablecoin_lending_deposit'),
}));
jest.mock('../../../../UI/Money/hooks/useMoneyAccountBalance');
jest.mock('../../../../UI/Money/selectors/visibility');
jest.mock('../../../../UI/Money/hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: jest.fn(() => ({
    trackSurfaceClicked: mockMoneyTrackSurfaceClicked,
  })),
}));
jest.mock('../../../../UI/Money/hooks/useMoneyNavigation');
jest.mock('../../../../Views/Homepage/hooks/useHomeViewedEvent');
jest.mock('../../../../Views/Homepage/hooks/useSectionPerformance');
jest.mock('../../../../UI/Earn/hooks/useEarnAnalytics', () => ({
  useEarnAnalytics: jest.fn(() => ({
    trackButtonClicked: mockEarnTrackButtonClicked,
    trackComponentViewed: mockEarnTrackComponentViewed,
    trackSurfaceClicked: mockEarnTrackSurfaceClicked,
  })),
}));
jest.mock('../../../../../util/Logger');
jest.mock(
  '../../../../UI/Assets/components/AssetLogo/AssetLogo',
  () => () => null,
);

const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseIsFocused = useIsFocused as jest.MockedFunction<
  typeof useIsFocused
>;
const mockUseTailwind = useTailwind as jest.MockedFunction<typeof useTailwind>;
const mockUseEarnSectionAssets = jest.mocked(useEarnSectionAssets);
const mockUseEarnOpportunityNavigation = jest.mocked(
  useEarnOpportunityNavigation,
);
const mockUseEarnAnalytics = jest.mocked(useEarnAnalytics);
const mockUseMoneyAccountBalance =
  useMoneyAccountBalance as jest.MockedFunction<typeof useMoneyAccountBalance>;
const mockUseSelector = jest.mocked(useSelector);
const mockUseMoneyNavigation = useMoneyNavigation as jest.MockedFunction<
  typeof useMoneyNavigation
>;
const mockUseHomeViewedEvent = useHomeViewedEvent as jest.MockedFunction<
  typeof useHomeViewedEvent
>;
const mockUseSectionPerformance = useSectionPerformance as jest.MockedFunction<
  typeof useSectionPerformance
>;
const mockLoggerError = jest.mocked(Logger.error);

const assetId =
  'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as EarnAssetId;
type HeldEarnSectionAsset = Extract<EarnSectionRankedAsset, { kind: 'held' }>;

const assetSlot: {
  kind: 'asset';
  key: string;
  asset: HeldEarnSectionAsset;
} = {
  kind: 'asset',
  key: assetId,
  asset: {
    kind: 'held',
    assetId,
    asset: {
      accountType: EthAccountType.Eoa,
      accountId: 'account-id',
      assetId: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      chainId: '0x1',
      decimals: 6,
      image: 'usdc.png',
      name: 'USD Coin',
      symbol: 'USDC',
      balance: '10',
      rawBalance: '0x989680',
      fiat: { balance: 10, currency: 'USD', conversionRate: 1 },
      isNative: false,
    } as Asset,
    experiences: [
      {
        id: 'lending:1:aave:usdc',
        type: EARN_EXPERIENCES.STABLECOIN_LENDING,
        role: 'underlying',
        rate: {
          type: 'APY',
          percentage: 4.2,
          status: 'ready',
        },
        isFeeSubsidized: false,
      },
    ],
    highestRatePercent: 4.2,
    highestRateExperience: {
      id: 'lending:1:aave:usdc',
      type: EARN_EXPERIENCES.STABLECOIN_LENDING,
      role: 'underlying',
      rate: {
        type: 'APY',
        percentage: 4.2,
        status: 'ready',
      },
      isFeeSubsidized: false,
    },
    rateStatus: 'ready',
  },
};
const zeroBalanceAssetSlot: typeof assetSlot = {
  ...assetSlot,
  asset: {
    ...assetSlot.asset,
    asset: {
      ...assetSlot.asset.asset,
      balance: '0',
      rawBalance: '0x0',
      fiat: { balance: 0, currency: 'USD', conversionRate: 1 },
    } as Asset,
  },
};
const navigate = jest.fn();
const mockNavigateFromEarnAsset = jest.fn();
const mockRefetchBalance = jest.fn();
let mockMoneyAccountVisible = false;
let mockPrivacyMode = false;

const createSectionResult = (
  overrides: Partial<ReturnType<typeof useEarnSectionAssets>> = {},
): ReturnType<typeof useEarnSectionAssets> => ({
  assetSlots: [assetSlot],
  hasMoreAssets: false,
  moneyApyPercent: 6.2,
  moneyRateStatus: 'ready',
  isLoading: false,
  hasError: false,
  errors: [],
  refresh: jest.fn(),
  ...overrides,
});

const mockSectionResult = (
  overrides: Partial<ReturnType<typeof useEarnSectionAssets>> = {},
) => {
  mockUseEarnSectionAssets.mockReturnValue(createSectionResult(overrides));
};

const mockEarnOpportunityNavigation = () => {
  mockUseEarnOpportunityNavigation.mockReturnValue({
    navigateFromEarnAsset: mockNavigateFromEarnAsset,
    navigateToDepositForExperience: jest.fn(),
  });
};

const getSuccessArrowIcons = () =>
  screen
    .UNSAFE_queryAllByType(Icon)
    .filter(
      ({ props }) =>
        props.name === IconName.ArrowRight &&
        props.color === IconColor.SuccessDefault,
    );

const renderEarnSection = (
  props: Partial<React.ComponentProps<typeof EarnSection>> = {},
) =>
  render(
    <EarnSection
      tokenDetailsSource={TokenDetailsSource.ExploreEarn}
      analyticsContext={{
        component_name: EARN_MODULE_COMPONENT_NAMES.EXPLORE_EARN_SECTION,
        screen_name: EARN_MODULE_SCREEN_NAMES.EXPLORE,
        entry_point: EARN_MODULE_ENTRY_POINTS.EXPLORE,
      }}
      {...props}
    />,
  );

describe('EarnSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetEarnSectionRefreshForTests();
    mockUseIsFocused.mockReturnValue(true);
    mockMoneyAccountVisible = false;
    mockPrivacyMode = false;
    mockUseSelector.mockImplementation((selector) =>
      selector === selectIsMoneyAccountVisible
        ? mockMoneyAccountVisible
        : mockPrivacyMode,
    );
    mockUseNavigation.mockReturnValue({
      navigate,
    } as unknown as ReturnType<typeof useNavigation>);
    mockUseTailwind.mockReturnValue({
      style: jest.fn(() => ({})),
    } as unknown as ReturnType<typeof useTailwind>);
    mockUseMoneyAccountBalance.mockReturnValue({
      totalFiatFormatted: '$0.00',
      totalFiatRaw: '0',
      isBalanceLoading: false,
      refetchBalance: mockRefetchBalance,
    } as unknown as ReturnType<typeof useMoneyAccountBalance>);
    mockUseMoneyNavigation.mockReturnValue({
      isOnboardingRedirectNeeded: false,
      navigateToMoneyHome: mockNavigateToMoneyHome,
    } as ReturnType<typeof useMoneyNavigation>);
    mockEarnOpportunityNavigation();
    mockUseHomeViewedEvent.mockReturnValue({
      onLayout: jest.fn(),
    } as ReturnType<typeof useHomeViewedEvent>);
    mockUseSectionPerformance.mockReturnValue(undefined);
    mockSectionResult();
  });

  it('renders the Earn section title', () => {
    renderEarnSection();

    expect(
      screen.getByText(strings('homepage.sections.earn')),
    ).toBeOnTheScreen();
    expect(mockUseEarnAnalytics).toHaveBeenCalledWith({
      component_name: EARN_MODULE_COMPONENT_NAMES.EXPLORE_EARN_SECTION,
      screen_name: EARN_MODULE_SCREEN_NAMES.EXPLORE,
      entry_point: EARN_MODULE_ENTRY_POINTS.EXPLORE,
    });
    expect(mockEarnTrackComponentViewed).toHaveBeenCalledWith({
      component_name: EARN_MODULE_COMPONENT_NAMES.EXPLORE_EARN_SECTION,
    });
  });

  it('navigates both Earn section view-all actions to the market list', () => {
    mockSectionResult({ hasMoreAssets: true });

    renderEarnSection();

    fireEvent.press(
      screen.getByTestId(homepageSectionTitleTestId(HomeSectionNames.EARN)),
    );
    fireEvent.press(screen.getByTestId(EarnSectionTestIds.VIEW_MORE_CARD));

    expect(navigate).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenNthCalledWith(1, Routes.EARN.ROOT, {
      screen: Routes.EARN.SEARCH_LIST,
      params: {
        analyticsContext: {
          entry_point: EARN_MODULE_ENTRY_POINTS.EXPLORE,
          screen_name: EARN_MODULE_SCREEN_NAMES.EXPLORE,
        },
      },
    });
    expect(navigate).toHaveBeenNthCalledWith(2, Routes.EARN.ROOT, {
      screen: Routes.EARN.SEARCH_LIST,
      params: {
        analyticsContext: {
          entry_point: EARN_MODULE_ENTRY_POINTS.EXPLORE,
          screen_name: EARN_MODULE_SCREEN_NAMES.EXPLORE,
        },
      },
    });
    expect(mockEarnTrackSurfaceClicked).toHaveBeenCalledWith(
      expect.objectContaining({
        component_name: EARN_MODULE_COMPONENT_NAMES.EARN_SECTION_VIEW_MORE_CARD,
        redirect_target: 'earn_section_list_view',
      }),
    );
  });

  it('disables Homepage telemetry for shared Explore rendering', () => {
    renderEarnSection();

    expect(mockUseHomeViewedEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        sectionRef: null,
        sectionIndex: -1,
        totalSectionsLoaded: 0,
        fireImmediateWhenNoView: false,
      }),
    );
    expect(mockUseSectionPerformance).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('passes required section metadata to Homepage telemetry', () => {
    render(<HomepageEarnSection sectionIndex={2} totalSectionsLoaded={5} />);

    expect(mockUseHomeViewedEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        sectionIndex: 2,
        totalSectionsLoaded: 5,
        fireImmediateWhenNoView: true,
        onSectionViewed: expect.any(Function),
      }),
    );
    expect(mockUseSectionPerformance).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true }),
    );
    expect(mockUseEarnAnalytics).toHaveBeenCalledWith({
      component_name: EARN_MODULE_COMPONENT_NAMES.HOMEPAGE_EARN_SECTION,
      entry_point: EARN_MODULE_ENTRY_POINTS.HOMEPAGE,
      screen_name: 'wallet_home',
    });
  });

  it('tracks Homepage Earn when Homepage telemetry records the section view', () => {
    render(<HomepageEarnSection sectionIndex={2} totalSectionsLoaded={5} />);

    const { onSectionViewed } = mockUseHomeViewedEvent.mock.calls[0][0];
    onSectionViewed?.();

    expect(mockEarnTrackComponentViewed).toHaveBeenCalledWith({
      component_name: EARN_MODULE_COMPONENT_NAMES.HOMEPAGE_EARN_SECTION,
    });
  });

  it('disables Homepage telemetry while Home is unfocused', () => {
    mockUseIsFocused.mockReturnValue(false);

    render(<HomepageEarnSection sectionIndex={2} totalSectionsLoaded={5} />);

    expect(mockUseHomeViewedEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        sectionRef: null,
        fireImmediateWhenNoView: false,
      }),
    );
    expect(mockUseSectionPerformance).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('renders funded lending assets with Get APY copy', () => {
    renderEarnSection();

    expect(
      screen.getByTestId(EarnSectionTestIds.ASSET_CARD(0)),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        strings('earn_module.get_rate_apy', {
          percentage: '4.2',
        }),
      ),
    ).toBeOnTheScreen();
  });

  it('renders APR copy for funded staking assets', () => {
    mockSectionResult({
      assetSlots: [
        {
          ...assetSlot,
          asset: {
            ...assetSlot.asset,
            highestRateExperience: {
              id: 'pooled:eip155:1/slip44:60',
              type: EARN_EXPERIENCES.POOLED_STAKING,
              role: 'underlying',
              rate: {
                type: 'APR',
                percentage: 4.2,
                status: 'ready',
              },
              isFeeSubsidized: false,
            },
          },
        },
      ],
    });

    renderEarnSection();

    expect(
      screen.getByText(
        strings('earn_module.get_rate_apr', {
          percentage: '4.2',
        }),
      ),
    ).toBeOnTheScreen();
  });

  it('renders New on the Money card with a zero balance', () => {
    mockMoneyAccountVisible = true;
    mockSectionResult({ assetSlots: [] });

    renderEarnSection();

    expect(
      screen.getByTestId(EarnSectionTestIds.MONEY_ACCOUNT_CARD),
    ).toBeOnTheScreen();
    expect(screen.getByText(strings('earn_module.new_tag'))).toBeOnTheScreen();
  });

  it('hides New on the Money card with a nonzero balance', () => {
    mockMoneyAccountVisible = true;
    mockUseMoneyAccountBalance.mockReturnValue({
      totalFiatFormatted: '$10.00',
      totalFiatRaw: '10',
    } as ReturnType<typeof useMoneyAccountBalance>);
    mockSectionResult({ assetSlots: [] });

    renderEarnSection();

    expect(
      screen.queryByText(strings('earn_module.new_tag')),
    ).not.toBeOnTheScreen();
  });

  it('masks the Money balance when privacy mode is enabled', () => {
    mockMoneyAccountVisible = true;
    mockPrivacyMode = true;
    mockUseMoneyAccountBalance.mockReturnValue({
      totalFiatFormatted: '$10.00',
      totalFiatRaw: '10',
    } as ReturnType<typeof useMoneyAccountBalance>);
    mockSectionResult({ assetSlots: [] });

    renderEarnSection();

    expect(
      within(
        screen.getByTestId(EarnSectionTestIds.MONEY_ACCOUNT_CARD),
      ).getByText('•'.repeat(9)),
    ).toBeOnTheScreen();
    expect(screen.queryByText('$10.00')).not.toBeOnTheScreen();
  });

  it('hides New on the Money card when balance is unavailable', () => {
    mockMoneyAccountVisible = true;
    mockUseMoneyAccountBalance.mockReturnValue({
      totalFiatFormatted: undefined,
      totalFiatRaw: undefined,
    } as ReturnType<typeof useMoneyAccountBalance>);
    mockSectionResult({ assetSlots: [] });

    renderEarnSection();

    expect(
      screen.queryByText(strings('earn_module.new_tag')),
    ).not.toBeOnTheScreen();
    expect(
      screen.getByText(strings('earn_module.balance_unavailable')),
    ).toBeOnTheScreen();
  });

  it('renders a skeleton while the Money balance is loading', () => {
    mockMoneyAccountVisible = true;
    mockUseMoneyAccountBalance.mockReturnValue({
      totalFiatFormatted: undefined,
      totalFiatRaw: undefined,
      isBalanceLoading: true,
    } as ReturnType<typeof useMoneyAccountBalance>);
    mockSectionResult({ assetSlots: [] });

    renderEarnSection();

    expect(
      screen.getByTestId(EarnSectionTestIds.MONEY_ACCOUNT_BALANCE_SKELETON),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(strings('earn_module.balance_unavailable')),
    ).not.toBeOnTheScreen();
  });

  it('renders a skeleton while the Money APY is loading', () => {
    mockMoneyAccountVisible = true;
    mockSectionResult({
      assetSlots: [],
      moneyApyPercent: undefined,
      moneyRateStatus: 'loading',
    });

    renderEarnSection();

    expect(
      screen.getByTestId(EarnSectionTestIds.MONEY_ACCOUNT_APY_SKELETON),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(strings('earn_module.rate_unavailable')),
    ).not.toBeOnTheScreen();
  });

  it('renders unavailable APY copy after loading settles without a rate', () => {
    mockMoneyAccountVisible = true;
    mockSectionResult({
      assetSlots: [],
      moneyApyPercent: undefined,
      moneyRateStatus: 'unavailable',
    });

    renderEarnSection();

    expect(
      screen.getByText(strings('earn_module.rate_unavailable')),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(EarnSectionTestIds.MONEY_ACCOUNT_APY_SKELETON),
    ).not.toBeOnTheScreen();
  });

  it('uses the asset name for zero-balance tiles', () => {
    mockSectionResult({ assetSlots: [zeroBalanceAssetSlot] });

    renderEarnSection();

    expect(
      screen.getByTestId(EarnSectionTestIds.ASSET_CARD(0)),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(zeroBalanceAssetSlot.asset.asset.name),
    ).toBeOnTheScreen();
    expect(
      screen.queryByText(strings('earn_module.get_started')),
    ).not.toBeOnTheScreen();
  });

  it('masks the asset balance when privacy mode is enabled', () => {
    mockPrivacyMode = true;

    renderEarnSection();

    expect(
      within(screen.getByTestId(EarnSectionTestIds.ASSET_CARD(0))).getByText(
        '•'.repeat(9),
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText('$10.00')).not.toBeOnTheScreen();
  });

  it('removes green arrows from Money and asset tiles', () => {
    mockMoneyAccountVisible = true;

    renderEarnSection();

    expect(getSuccessArrowIcons()).toHaveLength(0);
  });

  it('passes selected asset and source to Earn opportunity navigation', () => {
    renderEarnSection();

    fireEvent.press(screen.getByTestId(EarnSectionTestIds.ASSET_CARD(0)));

    expect(mockNavigateFromEarnAsset).toHaveBeenCalledWith(
      assetSlot.asset,
      TokenDetailsSource.ExploreEarn,
      {
        entry_point: EARN_MODULE_ENTRY_POINTS.EXPLORE,
        screen_name: EARN_MODULE_SCREEN_NAMES.EXPLORE,
        asset_position: 1,
        assets_in_list: 1,
      },
    );
    expect(mockEarnTrackSurfaceClicked).toHaveBeenCalledWith({
      component_name: EARN_MODULE_COMPONENT_NAMES.EARN_SECTION_ASSET_CARD,
      asset_symbol: 'USDC',
      chain_id: '0x1',
      asset_position: 1,
      assets_in_list: 1,
      eligible_strategy_count: 1,
      eligible_strategy_types: ['stablecoin_lending'],
      asset_has_balance: true,
      rate_percentage: 4.2,
      is_fee_subsidized: false,
      redirect_target: 'stablecoin_lending_deposit',
    });
  });

  it.each([
    {
      isOnboardingRedirectNeeded: true,
      redirectTarget: 'money_onboarding',
    },
    {
      isOnboardingRedirectNeeded: false,
      redirectTarget: 'money_home',
    },
  ] as const)(
    'tracks Money account card presses with the $redirectTarget destination',
    ({ isOnboardingRedirectNeeded, redirectTarget }) => {
      mockMoneyAccountVisible = true;
      mockUseMoneyNavigation.mockReturnValue({
        isOnboardingRedirectNeeded,
        navigateToMoneyHome: mockNavigateToMoneyHome,
      } as ReturnType<typeof useMoneyNavigation>);
      mockSectionResult({ assetSlots: [] });

      renderEarnSection();

      fireEvent.press(
        screen.getByTestId(EarnSectionTestIds.MONEY_ACCOUNT_CARD),
      );

      expect(mockMoneyTrackSurfaceClicked).toHaveBeenCalledWith({
        component_name: 'earn_section_money_card',
        redirect_target: redirectTarget,
      });
      expect(mockNavigateToMoneyHome).toHaveBeenCalledWith();
    },
  );

  it('passes zero-balance asset and Home source to Earn opportunity navigation', () => {
    mockSectionResult({ assetSlots: [zeroBalanceAssetSlot] });

    render(<HomepageEarnSection sectionIndex={0} totalSectionsLoaded={1} />);

    fireEvent.press(screen.getByTestId(EarnSectionTestIds.ASSET_CARD(0)));

    expect(mockNavigateFromEarnAsset).toHaveBeenCalledWith(
      zeroBalanceAssetSlot.asset,
      TokenDetailsSource.HomeSection,
      expect.objectContaining({
        entry_point: 'homepage',
      }),
    );
  });

  it('displays a retryable error without hiding healthy asset cards', () => {
    mockSectionResult({
      hasError: true,
    });

    renderEarnSection();

    expect(screen.getByTestId(EarnSectionTestIds.ERROR)).toBeOnTheScreen();
    expect(
      screen.getByTestId(EarnSectionTestIds.ASSET_CARD(0)),
    ).toBeOnTheScreen();
  });

  it('does not refresh for the initial Explore trigger', () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    mockSectionResult({ refresh });

    renderEarnSection({
      refresh: { trigger: 0, silentRefresh: true },
    });

    expect(refresh).not.toHaveBeenCalled();
    expect(mockRefetchBalance).not.toHaveBeenCalled();
  });

  it('does not refresh or query Money balance while disabled', async () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    mockSectionResult({ refresh });

    renderEarnSection({
      enabled: false,
      refresh: { trigger: 1, silentRefresh: true },
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockUseEarnSectionAssets).toHaveBeenCalledWith({ enabled: false });
    expect(mockUseMoneyAccountBalance).toHaveBeenCalledWith({
      enabled: false,
    });
    expect(refresh).not.toHaveBeenCalled();
    expect(mockRefetchBalance).not.toHaveBeenCalled();
  });

  it('refreshes catalogue and Money balance for an Explore trigger', async () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    mockSectionResult({ refresh });

    renderEarnSection({
      refresh: { trigger: 1, silentRefresh: true },
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(mockRefetchBalance).toHaveBeenCalledTimes(1);
  });

  it('logs when an Explore refresh fails', async () => {
    const error = new Error('Explore refresh failed');
    const refresh = jest.fn().mockRejectedValue(error);
    mockSectionResult({ refresh });

    renderEarnSection({
      refresh: { trigger: 1, silentRefresh: true },
    });

    await waitFor(() => {
      expect(mockLoggerError).toHaveBeenCalledWith(
        error,
        'EarnSection: Failed to refresh section data',
      );
    });
  });

  it('coalesces concurrent Explore refreshes across EarnSection instances', async () => {
    const firstRefresh = jest.fn().mockResolvedValue(undefined);
    const secondRefresh = jest.fn().mockResolvedValue(undefined);
    mockUseEarnSectionAssets
      .mockImplementationOnce(() =>
        createSectionResult({ refresh: firstRefresh }),
      )
      .mockImplementationOnce(() =>
        createSectionResult({ refresh: secondRefresh }),
      );

    render(
      <>
        <EarnSection
          tokenDetailsSource={TokenDetailsSource.ExploreEarn}
          analyticsContext={{
            component_name: EARN_MODULE_COMPONENT_NAMES.EXPLORE_EARN_SECTION,
            screen_name: EARN_MODULE_SCREEN_NAMES.EXPLORE,
            entry_point: EARN_MODULE_ENTRY_POINTS.EXPLORE,
          }}
          refresh={{ trigger: 1, silentRefresh: true }}
        />
        <EarnSection
          tokenDetailsSource={TokenDetailsSource.ExploreEarn}
          analyticsContext={{
            component_name: EARN_MODULE_COMPONENT_NAMES.EXPLORE_EARN_SECTION,
            screen_name: EARN_MODULE_SCREEN_NAMES.EXPLORE,
            entry_point: EARN_MODULE_ENTRY_POINTS.EXPLORE,
          }}
          refresh={{ trigger: 1, silentRefresh: true }}
        />
      </>,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(firstRefresh).toHaveBeenCalledTimes(1);
    expect(secondRefresh).not.toHaveBeenCalled();
    expect(mockRefetchBalance).toHaveBeenCalledTimes(1);
  });

  it('refreshes catalogue sources from the error action', async () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    mockSectionResult({
      hasError: true,
      refresh,
    });
    renderEarnSection();

    await act(async () => {
      fireEvent.press(
        screen.getByTestId(EarnSectionTestIds.ERROR_RETRY_BUTTON),
      );
    });

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('refreshes catalogue sources and Money balance from the section refresh handle', async () => {
    const refresh = jest.fn().mockResolvedValue(undefined);
    mockSectionResult({ refresh });
    const ref = createRef<SectionRefreshHandle>();

    render(
      <HomepageEarnSection
        ref={ref}
        sectionIndex={0}
        totalSectionsLoaded={1}
      />,
    );

    await act(async () => {
      await ref.current?.refresh();
    });

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(mockRefetchBalance).toHaveBeenCalledTimes(1);
  });

  it('prevents duplicate retries while a refresh is pending', async () => {
    let resolveRefresh: (() => void) | undefined;
    let refreshPromise: Promise<void> | undefined;
    const refresh = jest.fn(() => {
      refreshPromise = new Promise<void>((resolve) => {
        resolveRefresh = resolve;
      });
      return refreshPromise;
    });
    mockSectionResult({
      hasError: true,
      refresh,
    });
    renderEarnSection();

    const retryButton = screen.getByTestId(
      EarnSectionTestIds.ERROR_RETRY_BUTTON,
    );
    fireEvent.press(retryButton);
    fireEvent.press(retryButton);

    expect(refresh).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRefresh?.();
      await refreshPromise;
    });

    await act(async () => {
      fireEvent.press(retryButton);
      await Promise.resolve();
    });

    expect(refresh).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveRefresh?.();
      await refreshPromise;
    });
  });

  it('renders skeleton slots while catalogue data loads', () => {
    mockSectionResult({ isLoading: true });

    renderEarnSection();

    expect(screen.getByTestId(assetId)).toBeOnTheScreen();
    expect(
      screen.queryByTestId(EarnSectionTestIds.ASSET_CARD(0)),
    ).not.toBeOnTheScreen();
  });
});
