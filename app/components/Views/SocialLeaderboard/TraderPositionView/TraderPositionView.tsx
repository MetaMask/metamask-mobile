import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ScrollView } from 'react-native-gesture-handler';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import type { RootStackParamList } from '../../../../core/NavigationService/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Button,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { TraderPositionViewSelectorsIDs } from './TraderPositionView.testIds';
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
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'TraderPositionView'>>();
  const tw = useTailwind();

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
  const buyClickedRef = useRef(false);

  // Prefer the row-tap snapshot; fetch by UUID only when missing (deep link).
  const { position: fetchedPosition, isLoading: isPositionLoading } =
    useTraderPosition(positionParam ? undefined : positionId);
  const resolvedPosition = positionParam ?? fetchedPosition;

  // Skip the profile fetch when name/image already came in via nav params.
  const needsProfile = !traderNameParam || !traderImageUrlParam;
  const { profile: fetchedProfile, isLoading: isProfileLoading } =
    useTraderProfile(needsProfile ? traderId : '');
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

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

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

  // Dismissed fires only when the user backs out without ever clicking Buy.
  // Closing the QuickBuy sheet still counts as having visited the token screen.
  useEffect(
    () => () => {
      if (buyClickedRef.current) return;
      if (!followTradingTokenContext) return;
      track(MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_TOKEN_DISMISSED, {
        [SocialLeaderboardEventProperties.TRADER_ADDRESS]:
          followTradingTokenContext[
            SocialLeaderboardEventProperties.TRADER_ADDRESS
          ],
        [SocialLeaderboardEventProperties.CAIP19]:
          followTradingTokenContext[SocialLeaderboardEventProperties.CAIP19],
      });
    },
    [followTradingTokenContext, track],
  );

  const handleBuyPress = useCallback(() => {
    if (!resolvedPosition) return;
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
        onClose={handleClose}
        closeButtonTestID={TraderPositionViewSelectorsIDs.CLOSE_BUTTON}
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
          >
            <TraderTokenInfoRow
              symbol={symbol}
              position={resolvedPosition}
              marketCap={marketCap}
              pricePercentChange={pricePercentChange}
              activeTimePeriodLabel={activeTimePeriod}
            />

            <TraderPositionChartSection
              historicalPrices={historicalPrices}
              priceDiff={priceDiff}
              isPricesLoading={isPricesLoading}
              onChartIndexChange={handleChartIndexChange}
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
            <Button
              variant={ButtonVariant.Secondary}
              isFullWidth
              onPress={handleBuyPress}
              testID={TraderPositionViewSelectorsIDs.BUY_BUTTON}
            >
              {strings('social_leaderboard.trader_position.buy')}
            </Button>
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
