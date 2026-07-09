import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { type LayoutChangeEvent, RefreshControl, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSelector } from 'react-redux';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type {
  AppNavigationProp,
  RootStackParamList,
} from '../../../../core/NavigationService/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { playImpact, ImpactMoment } from '../../../../util/haptics';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
  useHeaderStandardAnimated,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { IconName as ComponentLibraryIconName } from '../../../../component-library/components/Icons/Icon';
import ClipboardManager from '../../../../core/ClipboardManager';
import { TraderPositionViewSelectorsIDs } from './TraderPositionView.testIds';
import { useTheme } from '../../../../util/theme';
import TraderPositionQuickBuy from './components/QuickBuy';
import TraderPositionHeader from './components/TraderPositionHeader';
import TraderPositionAnimatedHeader from './components/TraderPositionAnimatedHeader';
import TraderTokenInfoRow from './components/TraderTokenInfoRow';
import TraderPositionChartSection, {
  SOCIAL_POSITION_CHART_HEIGHT,
} from './components/TraderPositionChartSection';
import TraderTimePeriodSelector from './components/TraderTimePeriodSelector';
import TraderPositionPnLCard from './components/TraderPositionPnLCard';
import TraderTradesSection, {
  type TraderTradesSectionGeometry,
  type TraderTradesSectionHandle,
} from './components/TraderTradesSection';
import TraderPositionSkeleton from './components/TraderPositionSkeleton';
import TraderPositionFallback from './components/TraderPositionFallback';
import {
  useTraderPositionData,
  type TimePeriod,
} from './useTraderPositionData';
import { useTraderPosition } from './hooks/useTraderPosition';
import { useTraderProfile } from '../TraderProfileView/hooks/useTraderProfile';
import {
  buildFollowTradingTokenContext,
  pickFollowTradingDismissedProperties,
  SocialLeaderboardEventProperties,
  SocialLeaderboardEventValues,
  useSocialLeaderboardAnalytics,
  type FollowTradingTokenSource,
} from '../analytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { chainNameToId } from '../utils/chainMapping';
import { getPerpPositionDirection, isPerpPosition } from '../utils/perp';
import PerpsTradeButton from './components/PerpsTradeButton';
import {
  getPerpsDisplaySymbol,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import { toAssetId } from '../../../UI/Bridge/hooks/useAssetMetadata/utils';
import type { Trade } from '@metamask/social-controllers';
import {
  getTradeFocusSpanMs,
  type TradeFocusRequest,
} from './components/TraderAdvancedChart';
import { selectSocialLeaderboardPerpsEnabled } from '../../../../selectors/featureFlagController/socialLeaderboard';

// Estimate (chart + vertical margins + time selector) so the spacer and the
// sticky-header math are close before onLayout measures the real height — avoids
// a first-frame jump and a premature/late sticky toggle.
const INITIAL_CHART_BLOCK_HEIGHT = SOCIAL_POSITION_CHART_HEIGHT + 24 + 58;

const TraderPositionView = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute<RouteProp<RootStackParamList, 'TraderPositionView'>>();
  const tw = useTailwind();
  const { colors } = useTheme();
  const { toastRef } = useContext(ToastContext);

  const {
    traderId,
    traderName: traderNameParam,
    traderImageUrl: traderImageUrlParam,
    traderAddress: traderAddressParam,
    tokenSymbol,
    position: positionParam,
    positionId,
    source: sourceParam,
    isClosed: isClosedParam,
    notificationSubtype,
  } = route.params;
  const { track } = useSocialLeaderboardAnalytics();
  const isPerpsEnabled = useSelector(selectSocialLeaderboardPerpsEnabled);

  const [isQuickBuyVisible, setIsQuickBuyVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const ctaClickedRef = useRef(false);

  // Position resolution: always fetch by id when we have one so pull-to-refresh
  // can swap in fresh data. The row-tap snapshot (`positionParam`) is used as
  // the initial value to avoid a loading skeleton; once `fetchedPosition`
  // resolves it takes precedence. Falls back to `positionParam.positionId`
  // when the deeplink-style `positionId` route param isn't provided.
  const effectivePositionId = positionId ?? positionParam?.positionId;
  const {
    position: fetchedPosition,
    isLoading: isPositionLoading,
    refetch: refetchPosition,
  } = useTraderPosition(effectivePositionId);
  const resolvedPosition = fetchedPosition ?? positionParam;
  const isBlockedPerpPosition =
    resolvedPosition != null &&
    !isPerpsEnabled &&
    isPerpPosition(resolvedPosition);
  const displayPosition = isBlockedPerpPosition ? undefined : resolvedPosition;

  // Nav-param values win on first render to avoid a header flicker; once the
  // profile resolves it fills in any missing fields and powers pull-to-refresh.
  const {
    profile: fetchedProfile,
    isLoading: isProfileLoading,
    refresh: refreshProfile,
  } = useTraderProfile(traderId);
  const traderName = traderNameParam ?? fetchedProfile?.profile?.name ?? '';
  const traderImageUrl =
    traderImageUrlParam ?? fetchedProfile?.profile?.imageUrl ?? undefined;
  const traderAddress =
    traderAddressParam ?? fetchedProfile?.profile?.address ?? '';

  const positionData = useTraderPositionData(
    displayPosition,
    tokenSymbol,
    isClosedParam,
  );
  const {
    symbol,
    marketCap,
    currentPrice,
    historicalPrices,
    priceDiff,
    isPricesLoading,
    pricePercentChange,
    isClosed,
    positionValue,
    pnlValue,
    pnlPercent,
    isPnlPositive,
    allTrades,
    activeTimePeriod,
    isTimePeriodAutoSelected,
    setActiveTimePeriod,
    setAutomaticTimePeriod,
    timePeriods,
  } = positionData;

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    playImpact(ImpactMoment.PullToRefresh);
    try {
      // Both hooks rethrow after logging; allSettled keeps one failure from
      // taking down the other refetch and prevents an unhandled rejection
      // from surfacing in the UI.
      await Promise.allSettled([refetchPosition(), refreshProfile()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchPosition, refreshProfile]);

  // Plain goBack: returns to whatever the user was on before opening this
  // screen — Profile (in-app row tap), Wallet Home (cold-start push), or the
  // Notifications panel (in-app notification tap). The trader's name in the
  // header is the affordance for navigating onward to Profile.
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleTraderPress = useCallback(() => {
    navigation.navigate(Routes.SOCIAL_LEADERBOARD.PROFILE, {
      traderId,
      traderName,
    });
  }, [navigation, traderId, traderName]);

  const handleCopyTokenAddress = useCallback(async () => {
    if (!displayPosition?.tokenAddress) {
      return;
    }

    await ClipboardManager.setString(displayPosition.tokenAddress);
    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      iconName: ComponentLibraryIconName.CheckBold,
      iconColor: colors.accent03.dark,
      backgroundColor: colors.accent03.normal,
      labelOptions: [
        { label: strings('detected_tokens.address_copied_to_clipboard') },
      ],
      hasNoTimeout: false,
    });
  }, [
    colors.accent03.dark,
    colors.accent03.normal,
    displayPosition?.tokenAddress,
    toastRef,
  ]);

  // Narrow the open-ended nav source into the QuickBuySheetSource schema enum.
  // `deep_link` collapses to `profile_position` (its canonical host).
  const quickBuySource: 'notification' | 'profile_position' | 'leaderboard' =
    sourceParam === 'notification' || sourceParam === 'leaderboard'
      ? sourceParam
      : 'profile_position';

  // Narrow into FollowTradingTokenSource. `profile_position` from a row-tap
  // maps to `trader_profile` (the upstream surface in the schema).
  const followTradingTokenSource: FollowTradingTokenSource =
    sourceParam === 'leaderboard' ||
    sourceParam === 'notification' ||
    sourceParam === 'deep_link'
      ? sourceParam
      : 'trader_profile';

  // Derive identifiers once so screen-viewed / cta-clicked / dismissed share them.
  const followTradingTokenContext = useMemo(() => {
    if (!displayPosition) return null;
    return buildFollowTradingTokenContext(displayPosition, traderAddress);
  }, [displayPosition, traderAddress]);

  // Ref-guarded so the event fires once per mount, not on every context refresh.
  const hasFiredScreenViewedRef = useRef(false);
  useEffect(() => {
    if (hasFiredScreenViewedRef.current) return;
    if (!followTradingTokenContext) return;
    hasFiredScreenViewedRef.current = true;
    track(MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_TOKEN_SCREEN_VIEWED, {
      ...followTradingTokenContext,
      [SocialLeaderboardEventProperties.SOURCE]: followTradingTokenSource,
      ...(notificationSubtype !== undefined && {
        [SocialLeaderboardEventProperties.NOTIFICATION_SUBTYPE]:
          notificationSubtype,
      }),
    });
  }, [
    followTradingTokenContext,
    followTradingTokenSource,
    notificationSubtype,
    track,
  ]);

  // Keep a stable ref to the latest context so the dismissed-cleanup effect
  // can read the current value without listing it as a dependency.
  // Listing followTradingTokenContext as a dep would cause the cleanup to run
  // (and fire a false "dismissed" event) every time the position re-fetches.
  const followTradingTokenContextRef = useRef(followTradingTokenContext);
  useEffect(() => {
    followTradingTokenContextRef.current = followTradingTokenContext;
  }, [followTradingTokenContext]);

  // Dismissed fires only when the user backs out without ever clicking Buy or Trade.
  // Closing the QuickBuy sheet still counts as having visited the token screen.
  // Empty dep array ensures the cleanup runs ONLY on unmount, never on re-render.
  useEffect(
    () => () => {
      if (ctaClickedRef.current) return;
      const ctx = followTradingTokenContextRef.current;
      if (!ctx) return;
      track(
        MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_TOKEN_DISMISSED,
        pickFollowTradingDismissedProperties(ctx),
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const trackFollowTradingCtaClicked = useCallback(
    (
      ctaType:
        | typeof SocialLeaderboardEventValues.CTA_TYPE.BUY
        | typeof SocialLeaderboardEventValues.CTA_TYPE.TRADE,
    ) => {
      if (!followTradingTokenContext) return;
      track(MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_TOKEN_CTA_CLICKED, {
        ...followTradingTokenContext,
        [SocialLeaderboardEventProperties.CTA_TYPE]: ctaType,
      });
    },
    [followTradingTokenContext, track],
  );

  const handleBuyPress = useCallback(() => {
    if (!displayPosition) return;
    // Primary CTA opening the buy flow — distinct from tab-bar `TabChange`.
    // Success/error notification haptics fire later in useQuickBuyBottomSheet.
    playImpact(ImpactMoment.PrimaryCTA);
    setIsQuickBuyVisible(true);
    ctaClickedRef.current = true;
    trackFollowTradingCtaClicked(SocialLeaderboardEventValues.CTA_TYPE.BUY);
  }, [displayPosition, trackFollowTradingCtaClicked]);

  const handleQuickBuyClose = useCallback(() => {
    setIsQuickBuyVisible(false);
  }, []);

  const handleChartIndexChange = useCallback((_index: number) => {
    // Legacy (perp) chart scrub: price readout not wired for the SVG chart.
  }, []);

  // Crosshair % change reported by the spot AdvancedChart while scrubbing.
  // Overrides the header percent until the crosshair leaves the chart.
  const [scrubPercent, setScrubPercent] = useState<number | null>(null);
  // Reset the scrub override whenever the time period changes so a stale
  // percent from a previous range never lingers in the header.
  useEffect(() => {
    setScrubPercent(null);
  }, [activeTimePeriod]);
  const displayPercentChange = scrubPercent ?? pricePercentChange;

  // Perp positions surface Long/Short CTAs instead of Buy. Hyperliquid has no
  // long/short preselect param on the market page (direction only exists on the
  // funded trade-entry flow), so both CTAs land the user on that market's Perps
  // page. A minimal { symbol, name } market is enough — PerpsMarketDetailsView
  // enriches it from usePerpsMarkets (same pattern as PerpsPositionTransactionView).
  const isPerp = displayPosition ? isPerpPosition(displayPosition) : false;
  const perpDirection =
    isPerp && displayPosition
      ? getPerpPositionDirection(displayPosition)
      : null;

  // CAIP-19 asset id for the spot chart. Resolves only for non-perp positions on
  // a supported chain; when undefined the chart section uses the legacy SVG
  // chart (perps have no CAIP id and feed prices from the Hyperliquid candle
  // feed instead).
  const chartAssetId = useMemo(() => {
    if (!resolvedPosition || isPerp) return undefined;
    const caipChainId = chainNameToId(resolvedPosition.chain);
    if (!caipChainId) return undefined;
    return toAssetId(resolvedPosition.tokenAddress, caipChainId);
  }, [resolvedPosition, isPerp]);

  // The xyz/HIP-3 resolution + existence check lives in PerpsTradeButton (it
  // owns the market-data subscription); here we just navigate to whichever
  // `xyz` market it resolved. A minimal { symbol, name } market is enough —
  // PerpsMarketDetailsView enriches it from usePerpsMarkets (same pattern as
  // PerpsPositionTransactionView).
  const handlePerpTrade = useCallback(
    (targetSymbol: string) => {
      playImpact(ImpactMoment.PrimaryCTA);
      ctaClickedRef.current = true;
      trackFollowTradingCtaClicked(SocialLeaderboardEventValues.CTA_TYPE.TRADE);

      const market = {
        symbol: targetSymbol,
        name: getPerpsDisplaySymbol(targetSymbol),
      } as PerpsMarketData;
      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: { market, source: 'social_leaderboard' },
      });
    },
    [navigation, trackFollowTradingCtaClicked],
  );

  // Tapping a trade row slides the chart to center that trade. The nonce changes
  // on every tap so re-tapping the same trade re-centers it.
  const focusNonceRef = useRef(0);
  const [focusRequest, setFocusRequest] = useState<TradeFocusRequest>();
  const handleRequestFocusTimePeriod = useCallback(
    (timePeriod: TimePeriod) => {
      setAutomaticTimePeriod(timePeriod);
      setFocusRequest((current) =>
        current
          ? {
              ...current,
              spanMs: getTradeFocusSpanMs(timePeriod),
            }
          : current,
      );
    },
    [setAutomaticTimePeriod],
  );

  const handleTradePress = useCallback(
    (trade: Trade) => {
      focusNonceRef.current += 1;
      setFocusRequest({
        id: trade.transactionHash,
        timestamp: trade.timestamp,
        nonce: focusNonceRef.current,
        spanMs: getTradeFocusSpanMs(activeTimePeriod),
      });
    },
    [activeTimePeriod],
  );

  // Reverse interaction: tapping a circle on the chart scrolls the trades list
  // to that trade and briefly highlights its row. The emphasis is cleared after
  // a short delay so a later tap can re-trigger it.
  const tradesListRef = useRef<TraderTradesSectionHandle>(null);
  const [emphasizedTradeId, setEmphasizedTradeId] = useState<string | null>(
    null,
  );
  const emphasisTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMarkerPress = useCallback(
    (id: string) => {
      if (!allTrades.some((t) => t.transactionHash === id)) return;
      setEmphasizedTradeId(id);
      tradesListRef.current?.scrollToTrade(id);
      if (emphasisTimeoutRef.current) {
        clearTimeout(emphasisTimeoutRef.current);
      }
      emphasisTimeoutRef.current = setTimeout(() => {
        setEmphasizedTradeId(null);
        emphasisTimeoutRef.current = null;
      }, 2000);
    },
    [allTrades],
  );

  useEffect(
    () => () => {
      if (emphasisTimeoutRef.current) {
        clearTimeout(emphasisTimeoutRef.current);
      }
    },
    [],
  );

  const isInitialLoading =
    !displayPosition &&
    !isBlockedPerpPosition &&
    (isPositionLoading || isProfileLoading);
  const hasFailed =
    isBlockedPerpPosition ||
    (!displayPosition && !isPositionLoading && !isProfileLoading);

  const {
    scrollY: scrollYShared,
    onScroll,
    setTitleSectionHeight,
    titleSectionHeightSv,
  } = useHeaderStandardAnimated();

  // Scroll-linked pinned-chart layout:
  // - The token info row lives in the trades list header and scrolls up behind
  //   the nav; its measured height becomes `titleSectionHeight`, the threshold
  //   for the compact header AND for pinning the chart.
  // - The chart + time-period selector render in an absolutely-positioned overlay
  //   that translates up so it stays glued below the token row, then pins under
  //   the nav once the token row has scrolled off. A spacer in the list header
  //   reserves its height so the PnL card / trades start below the chart at rest.
  const [chartBlockHeight, setChartBlockHeight] = useState(
    INITIAL_CHART_BLOCK_HEIGHT,
  );
  const [isPinnedChartElevated, setIsPinnedChartElevated] = useState(false);
  // Floating sticky day header, driven by scroll OFFSET (not viewability):
  // `topDayIndex` is the index of the day section currently pinned behind the
  // chart's bottom edge (-1 = hidden). It is resolved on the UI thread from the
  // measured section geometry and only crosses back to JS when the index
  // actually changes — so the label tracks the scroll smoothly and never
  // burst-lags/snaps across day boundaries on fast scroll.
  const [topDayIndex, setTopDayIndex] = useState(-1);
  const [dayLabels, setDayLabels] = useState<string[]>([]);

  // UI-thread mirrors of the measured heights + section offsets so the sticky
  // reaction can read them off the worklet (React state isn't readable from a
  // worklet). `sectionOffsetsSv` holds each section's start offset relative to
  // the first section (see computeSectionStartOffsets).
  const chartBlockHeightSv = useSharedValue(INITIAL_CHART_BLOCK_HEIGHT);
  const listHeaderHeightSv = useSharedValue(0);
  const sectionOffsetsSv = useSharedValue<number[]>([]);

  // Geometry arrives only when the sections / measured heights change (never per
  // frame): mirror the offsets into the shared value for the worklet and keep
  // the labels in JS to map the resolved index back to its day label.
  const handleSectionGeometryChange = useCallback(
    (geometry: TraderTradesSectionGeometry) => {
      setDayLabels(geometry.dayLabels);
      sectionOffsetsSv.value = geometry.sectionOffsets;
    },
    [sectionOffsetsSv],
  );

  // Label shown by the floating sticky (and hidden in-list to avoid a duplicate).
  // Guarded with `?? null` so a stale index from a previous section set (e.g.
  // mid pull-to-refresh) never indexes past the new labels.
  const stickyTopDayLabel =
    topDayIndex >= 0 ? (dayLabels[topDayIndex] ?? null) : null;

  const handleTitleSectionLayout = useCallback(
    (event: LayoutChangeEvent) => {
      // Ceil to avoid a sub-pixel under-measure that would fire the compact
      // header / pin the chart a hair before the token row is fully gone.
      setTitleSectionHeight(Math.ceil(event.nativeEvent.layout.height));
    },
    [setTitleSectionHeight],
  );

  const handleChartBlockLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const height = Math.ceil(event.nativeEvent.layout.height);
      if (height > 0) {
        setChartBlockHeight(height);
        chartBlockHeightSv.value = height;
      }
    },
    [chartBlockHeightSv],
  );

  // Total list-header height (token row + chart spacer + PnL card). The first
  // in-list section header sits directly below this, so it's the basis for the
  // sticky-header handoff threshold.
  const handleListHeaderLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const height = Math.ceil(event.nativeEvent.layout.height);
      if (height > 0) {
        listHeaderHeightSv.value = height;
      }
    },
    [listHeaderHeightSv],
  );

  // Visual offset that also follows pull-to-refresh overscroll: at scrollY < 0
  // the chart moves DOWN with the bounce instead of freezing. Math is inlined
  // here (not imported) because Reanimated does not auto-bundle sibling worklet
  // helpers called from inside another worklet.
  const pinnedChartStyle = useAnimatedStyle(() => {
    const titleHeight = titleSectionHeightSv.value;
    const scroll = scrollYShared.value;
    const clamped = scroll < titleHeight ? scroll : titleHeight;
    return { transform: [{ translateY: titleHeight - clamped }] };
  });

  useAnimatedReaction(
    () => {
      const titleHeight = titleSectionHeightSv.value;
      return titleHeight > 0 && scrollYShared.value >= titleHeight;
    },
    (elevated, previous) => {
      if (elevated !== previous) {
        runOnJS(setIsPinnedChartElevated)(elevated);
      }
    },
  );

  // Resolve the floating sticky's day index from scroll offset on the UI thread.
  // The probe is the chart's bottom edge in content space, relative to the first
  // section (`scrollY + chartHeight - listHeaderHeight`): while negative the
  // first in-list header is still visible below the chart (sticky hidden, index
  // -1); otherwise the active section is the last one whose start offset is at or
  // before the probe. Only crossing to JS on an index CHANGE keeps this off the
  // per-frame React path (the screen previously regressed FPS from per-frame JS
  // state). Math is inlined (not imported) because Reanimated does not
  // auto-bundle sibling worklet helpers called from inside another worklet.
  useAnimatedReaction(
    () => {
      const headerHeight = listHeaderHeightSv.value;
      const chartHeight = chartBlockHeightSv.value;
      const offsets = sectionOffsetsSv.value;
      if (headerHeight <= 0 || chartHeight <= 0) {
        return -1;
      }
      const probe = scrollYShared.value + chartHeight - headerHeight;
      if (probe < 0) {
        return -1;
      }
      let index = -1;
      for (let i = 0; i < offsets.length; i++) {
        if (offsets[i] <= probe) {
          index = i;
        } else {
          break;
        }
      }
      return index;
    },
    (index, previous) => {
      if (index !== previous) {
        runOnJS(setTopDayIndex)(index);
      }
    },
  );

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      testID={TraderPositionViewSelectorsIDs.CONTAINER}
    >
      {isInitialLoading ? (
        <TraderPositionHeader
          traderName={traderName}
          traderImageUrl={traderImageUrl}
          traderAddress={traderAddress}
          onBack={handleBack}
          onTraderPress={handleTraderPress}
          backButtonTestID={TraderPositionViewSelectorsIDs.BACK_BUTTON}
          traderNameTestID={TraderPositionViewSelectorsIDs.TRADER_NAME_LINK}
        />
      ) : hasFailed ? (
        <TraderPositionHeader
          traderName={traderName}
          traderImageUrl={traderImageUrl}
          traderAddress={traderAddress}
          onBack={handleBack}
          onTraderPress={handleTraderPress}
          backButtonTestID={TraderPositionViewSelectorsIDs.BACK_BUTTON}
          traderNameTestID={TraderPositionViewSelectorsIDs.TRADER_NAME_LINK}
        />
      ) : (
        <TraderPositionAnimatedHeader
          scrollY={scrollYShared}
          titleSectionHeight={titleSectionHeightSv}
          traderName={traderName}
          traderImageUrl={traderImageUrl}
          traderAddress={traderAddress}
          symbol={symbol}
          pricePercentChange={displayPercentChange}
          activeTimePeriodLabel={activeTimePeriod}
          perpDirection={perpDirection}
          perpLeverage={displayPosition?.perpLeverage}
          onBack={handleBack}
          onTraderPress={handleTraderPress}
        />
      )}

      {isInitialLoading ? (
        <TraderPositionSkeleton />
      ) : hasFailed ? (
        <TraderPositionFallback traderId={traderId} traderName={traderName} />
      ) : (
        <>
          {/* Scroll-linked pinned-chart layout. The trades list owns the page
              scroll: its header carries the token info row (scrolls behind the
              nav), a spacer reserving the pinned chart's height, and the PnL
              card. The chart + time selector live in an absolutely-positioned
              overlay that translates up and pins below the nav. */}
          <View style={tw.style('flex-1')}>
            <TraderTradesSection
              ref={tradesListRef}
              trades={allTrades}
              traderImageUrl={traderImageUrl}
              traderAddress={traderAddress}
              onTradePress={
                chartAssetId || isPerp ? handleTradePress : undefined
              }
              emphasizedTradeId={emphasizedTradeId}
              onScroll={onScroll}
              onSectionGeometryChange={handleSectionGeometryChange}
              stickyDayLabel={stickyTopDayLabel}
              listHeaderComponent={
                // Measured as a whole (token row + spacer + PnL card) to derive
                // the sticky-header handoff threshold.
                <View onLayout={handleListHeaderLayout}>
                  <View
                    testID={TraderPositionViewSelectorsIDs.TOKEN_INFO_ROW}
                    onLayout={handleTitleSectionLayout}
                  >
                    <TraderTokenInfoRow
                      symbol={symbol}
                      position={displayPosition}
                      marketCap={marketCap}
                      currentPrice={currentPrice}
                      pricePercentChange={displayPercentChange}
                      activeTimePeriodLabel={activeTimePeriod}
                      onCopyTokenAddress={handleCopyTokenAddress}
                      copyTokenAddressTestID={
                        TraderPositionViewSelectorsIDs.COPY_TOKEN_ADDRESS_BUTTON
                      }
                    />
                  </View>
                  {/* Reserves the pinned chart overlay's footprint so the PnL
                      card and trades begin below the chart at rest. */}
                  <View style={{ height: chartBlockHeight }} />
                  <TraderPositionPnLCard
                    isClosed={isClosed}
                    positionValue={positionValue}
                    pnlValue={pnlValue}
                    pnlPercent={pnlPercent}
                    isPnlPositive={isPnlPositive}
                  />
                </View>
              }
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={handleRefresh}
                  testID={TraderPositionViewSelectorsIDs.REFRESH_CONTROL}
                />
              }
            />

            <Animated.View
              testID={TraderPositionViewSelectorsIDs.PINNED_CHART_OVERLAY}
              pointerEvents="box-none"
              style={[
                tw.style(
                  'absolute inset-x-0 top-0',
                  // Raise above the scrolling list only once the chart is pinned,
                  // so the token info row stays fully visible at rest.
                  isPinnedChartElevated ? 'z-10' : 'z-0',
                ),
                pinnedChartStyle,
              ]}
            >
              {/* The chart block stays fully interactive whether at rest or
                  pinned (crosshair scrubbing + marker taps). The page still
                  scrolls because the trades list below the chart is a normal
                  touchable region — the user scrolls there, not over the chart,
                  exactly like the fixed-header reference layout. `box-none` keeps
                  the wrapper itself from being a touch target so the bg-default
                  fill never blocks the list peeking out beside/below it. */}
              <View
                onLayout={handleChartBlockLayout}
                pointerEvents="box-none"
                style={tw.style('bg-default')}
              >
                <TraderPositionChartSection
                  historicalPrices={historicalPrices}
                  priceDiff={priceDiff}
                  isPricesLoading={isPricesLoading}
                  onChartIndexChange={handleChartIndexChange}
                  trades={allTrades}
                  assetId={chartAssetId}
                  isPerp={isPerp}
                  activeTimePeriod={activeTimePeriod}
                  shouldAutoRequestTimePeriod={isTimePeriodAutoSelected}
                  onScrubPercentChange={setScrubPercent}
                  focusRequest={focusRequest}
                  onRequestTimePeriod={handleRequestFocusTimePeriod}
                  onTradeMarkerPress={
                    chartAssetId || isPerp ? handleMarkerPress : undefined
                  }
                />
                <TraderTimePeriodSelector
                  timePeriods={timePeriods}
                  activeTimePeriod={activeTimePeriod}
                  onSelectPeriod={setActiveTimePeriod}
                />
              </View>

              {/* Custom sticky day header: native sticky headers would be hidden
                  behind the pinned chart, so once trades scroll behind the
                  chart's bottom edge we render the top-most visible day below it.
                  Driven by the offset-resolved `topDayIndex` (not
                  `isPinnedChartElevated`) so it doesn't appear while the PnL card
                  / first in-list header are still visible below the chart — which
                  would duplicate the day label. `pointerEvents="none"` keeps the
                  trades scrollable under the label. */}
              {stickyTopDayLabel ? (
                <View pointerEvents="none">
                  <Box
                    twClassName="bg-default px-4 pt-3"
                    testID={TraderPositionViewSelectorsIDs.STICKY_DAY_HEADER}
                  >
                    <Box twClassName="self-start pb-2">
                      <Text
                        variant={TextVariant.BodyMd}
                        fontWeight={FontWeight.Bold}
                        color={TextColor.TextDefault}
                      >
                        {stickyTopDayLabel}
                      </Text>
                    </Box>
                    <Box twClassName="h-px bg-muted" />
                  </Box>
                </View>
              ) : null}
            </Animated.View>
          </View>

          {isPerp && displayPosition ? (
            <PerpsTradeButton
              symbol={displayPosition.tokenSymbol}
              onTrade={handlePerpTrade}
              testID={TraderPositionViewSelectorsIDs.TRADE_BUTTON}
            />
          ) : (
            <>
              <Box twClassName="px-4 py-3">
                <Button
                  variant={ButtonVariant.Primary}
                  size={ButtonSize.Lg}
                  isFullWidth
                  onPress={handleBuyPress}
                  testID={TraderPositionViewSelectorsIDs.BUY_BUTTON}
                >
                  {strings('social_leaderboard.trader_position.buy')}
                </Button>
              </Box>

              <TraderPositionQuickBuy
                isVisible={isQuickBuyVisible}
                position={displayPosition ?? null}
                onClose={handleQuickBuyClose}
                traderAddress={traderAddress}
                marketCap={
                  typeof marketCap === 'number' ? marketCap : undefined
                }
                tokenPriceFiat={
                  typeof currentPrice === 'number' ? currentPrice : undefined
                }
                source={quickBuySource}
                isTraderPositionClosed={isClosed}
              />
            </>
          )}
        </>
      )}
    </SafeAreaView>
  );
};

export default TraderPositionView;
