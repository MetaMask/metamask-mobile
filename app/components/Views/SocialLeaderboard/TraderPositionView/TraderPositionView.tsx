import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { RefreshControl } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../../../core/NavigationService/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { playImpact, ImpactMoment } from '../../../../util/haptics';
import {
  Box,
  ButtonHero,
  ButtonHeroSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import {
  ToastContext,
  ToastVariants,
} from '../../../../component-library/components/Toast';
import { IconName as ComponentLibraryIconName } from '../../../../component-library/components/Icons/Icon';
import ClipboardManager from '../../../../core/ClipboardManager';
import { TraderPositionViewSelectorsIDs } from './TraderPositionView.testIds';
import { useTheme } from '../../../../util/theme';
import QuickBuyBottomSheet from './components/QuickBuyBottomSheet';
import TraderPositionHeader from './components/TraderPositionHeader';
import TraderTokenInfoRow from './components/TraderTokenInfoRow';
import TraderPositionChartSection from './components/TraderPositionChartSection';
import TraderTimePeriodSelector from './components/TraderTimePeriodSelector';
import TraderPositionPnLCard from './components/TraderPositionPnLCard';
import TraderTradesSection from './components/TraderTradesSection';
import TraderPositionSkeleton from './components/TraderPositionSkeleton';
import TraderPositionFallback from './components/TraderPositionFallback';
import { useTraderPositionData } from './useTraderPositionData';
import { useTraderPosition } from './hooks/useTraderPosition';
import { useTraderProfile } from '../TraderProfileView/hooks/useTraderProfile';
import {
  SocialLeaderboardEventProperties,
  SocialLeaderboardEventValues,
  useSocialLeaderboardAnalytics,
  type FollowTradingTokenSource,
} from '../analytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { chainNameToId } from '../utils/chainMapping';
import { toAssetId } from '../../../UI/Bridge/hooks/useAssetMetadata/utils';

const TraderPositionView = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
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
  } = route.params;
  const { track } = useSocialLeaderboardAnalytics();

  const [isQuickBuyVisible, setIsQuickBuyVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const buyClickedRef = useRef(false);

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

  const positionData = useTraderPositionData(resolvedPosition, tokenSymbol);
  const {
    symbol,
    marketCap,
    historicalPrices,
    priceDiff,
    isPricesLoading,
    pricePercentChange,
    isClosed,
    positionValue,
    pnlValue,
    pnlPercent,
    isPnlPositive,
    trades,
    activeTimePeriod,
    setActiveTimePeriod,
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

  const handleCopyTokenAddress = useCallback(async () => {
    if (!resolvedPosition?.tokenAddress) {
      return;
    }

    await ClipboardManager.setString(resolvedPosition.tokenAddress);
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
    resolvedPosition?.tokenAddress,
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

  // Derive identifiers once so screen-viewed / buy-clicked / dismissed share them.
  const followTradingTokenContext = useMemo(() => {
    if (!resolvedPosition || !traderAddress) return null;
    const caipChainId = chainNameToId(resolvedPosition.chain);
    const caip19 = caipChainId
      ? (toAssetId(resolvedPosition.tokenAddress, caipChainId) ?? '')
      : '';
    if (!caip19) return null;
    return {
      [SocialLeaderboardEventProperties.TRADER_ADDRESS]: traderAddress,
      [SocialLeaderboardEventProperties.CAIP19]: caip19,
      [SocialLeaderboardEventProperties.ASSET_NAME]:
        resolvedPosition.tokenSymbol,
    };
  }, [resolvedPosition, traderAddress]);

  // Ref-guarded so the event fires once per mount, not on every context refresh.
  const hasFiredScreenViewedRef = useRef(false);
  useEffect(() => {
    if (hasFiredScreenViewedRef.current) return;
    if (!followTradingTokenContext) return;
    hasFiredScreenViewedRef.current = true;
    track(MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_TOKEN_SCREEN_VIEWED, {
      ...followTradingTokenContext,
      [SocialLeaderboardEventProperties.SOURCE]: followTradingTokenSource,
    });
  }, [followTradingTokenContext, followTradingTokenSource, track]);

  // Keep a stable ref to the latest context so the dismissed-cleanup effect
  // can read the current value without listing it as a dependency.
  // Listing followTradingTokenContext as a dep would cause the cleanup to run
  // (and fire a false "dismissed" event) every time the position re-fetches.
  const followTradingTokenContextRef = useRef(followTradingTokenContext);
  useEffect(() => {
    followTradingTokenContextRef.current = followTradingTokenContext;
  }, [followTradingTokenContext]);

  // Dismissed fires only when the user backs out without ever clicking Buy.
  // Closing the QuickBuy sheet still counts as having visited the token screen.
  // Empty dep array ensures the cleanup runs ONLY on unmount, never on re-render.
  useEffect(
    () => () => {
      if (buyClickedRef.current) return;
      const ctx = followTradingTokenContextRef.current;
      if (!ctx) return;
      track(MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_TOKEN_DISMISSED, {
        [SocialLeaderboardEventProperties.TRADER_ADDRESS]:
          ctx[SocialLeaderboardEventProperties.TRADER_ADDRESS],
        [SocialLeaderboardEventProperties.CAIP19]:
          ctx[SocialLeaderboardEventProperties.CAIP19],
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handleBuyPress = useCallback(() => {
    if (!resolvedPosition) return;
    // Primary CTA opening the buy flow — distinct from tab-bar `TabChange`.
    // Success/error notification haptics fire later in useQuickBuyBottomSheet.
    playImpact(ImpactMoment.PrimaryCTA);
    setIsQuickBuyVisible(true);
    buyClickedRef.current = true;

    if (followTradingTokenContext) {
      track(
        MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_TOKEN_BUY_CLICKED,
        followTradingTokenContext,
      );
      track(MetaMetricsEvents.SOCIAL_QUICK_BUY_SHEET_VIEWED, {
        ...followTradingTokenContext,
        [SocialLeaderboardEventProperties.MARKET_CAP]:
          typeof marketCap === 'number' ? marketCap : undefined,
        [SocialLeaderboardEventProperties.SOURCE]: quickBuySource,
        [SocialLeaderboardEventProperties.TRADER_TRADE_TYPE]: isClosed
          ? SocialLeaderboardEventValues.TRADER_TRADE_TYPE.SELL
          : SocialLeaderboardEventValues.TRADER_TRADE_TYPE.BUY,
      });
    }
  }, [
    resolvedPosition,
    followTradingTokenContext,
    marketCap,
    quickBuySource,
    isClosed,
    track,
  ]);

  const handleQuickBuyClose = useCallback(() => {
    setIsQuickBuyVisible(false);
  }, []);

  const handleChartIndexChange = useCallback((_index: number) => {
    // TODO: update displayed price on scrub.
  }, []);

  const isInitialLoading =
    !resolvedPosition && (isPositionLoading || isProfileLoading);
  const hasFailed =
    !resolvedPosition && !isPositionLoading && !isProfileLoading;

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      testID={TraderPositionViewSelectorsIDs.CONTAINER}
    >
      <TraderPositionHeader
        traderName={traderName}
        onBack={handleBack}
        backButtonTestID={TraderPositionViewSelectorsIDs.BACK_BUTTON}
      />

      {isInitialLoading ? (
        <TraderPositionSkeleton />
      ) : hasFailed ? (
        <TraderPositionFallback traderId={traderId} traderName={traderName} />
      ) : (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={tw.style('pb-6')}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                testID={TraderPositionViewSelectorsIDs.REFRESH_CONTROL}
              />
            }
          >
            <TraderTokenInfoRow
              symbol={symbol}
              position={resolvedPosition}
              marketCap={marketCap}
              pricePercentChange={pricePercentChange}
              activeTimePeriodLabel={activeTimePeriod}
              onCopyTokenAddress={handleCopyTokenAddress}
              copyTokenAddressTestID={
                TraderPositionViewSelectorsIDs.COPY_TOKEN_ADDRESS_BUTTON
              }
            />

            <TraderPositionChartSection
              historicalPrices={historicalPrices}
              priceDiff={priceDiff}
              isPricesLoading={isPricesLoading}
              onChartIndexChange={handleChartIndexChange}
              trades={trades}
            />

            <TraderTimePeriodSelector
              timePeriods={timePeriods}
              activeTimePeriod={activeTimePeriod}
              onSelectPeriod={setActiveTimePeriod}
            />

            <TraderPositionPnLCard
              isClosed={isClosed}
              positionValue={positionValue}
              pnlValue={pnlValue}
              pnlPercent={pnlPercent}
              isPnlPositive={isPnlPositive}
            />

            <TraderTradesSection
              trades={trades}
              traderName={traderName}
              traderImageUrl={traderImageUrl}
            />
          </ScrollView>

          <Box twClassName="px-4 py-3">
            <ButtonHero
              size={ButtonHeroSize.Lg}
              isFullWidth
              onPress={handleBuyPress}
              testID={TraderPositionViewSelectorsIDs.BUY_BUTTON}
            >
              {strings('social_leaderboard.trader_position.buy')}
            </ButtonHero>
          </Box>

          <QuickBuyBottomSheet
            isVisible={isQuickBuyVisible}
            position={resolvedPosition ?? null}
            onClose={handleQuickBuyClose}
            traderAddress={traderAddress}
            marketCap={typeof marketCap === 'number' ? marketCap : undefined}
            source={quickBuySource}
          />
        </>
      )}
    </SafeAreaView>
  );
};

export default TraderPositionView;
