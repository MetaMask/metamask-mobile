import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Platform,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import {
  useSafeAreaFrame,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  BottomSheet,
  Box,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import {
  getPerpsDisplaySymbol,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import { formatAddressToAssetId } from '@metamask/bridge-controller';
import { parseCaipChainId } from '@metamask/utils';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { useParams } from '../../../../util/navigation/navUtils';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import type { TokenPrice } from '../../../hooks/useTokenHistoricalPrices';
import { toAssetId } from '../../../UI/Bridge/hooks/useAssetMetadata/utils';
import { useIsMemeToken } from '../../../UI/TokenDetails/hooks/useIsMemeToken';
import { toFeedAssetId } from '../../../UI/SocialFeed/data/socialFeedSource';
import TraderPositionQuickBuy, {
  positionToQuickBuyTarget,
} from '../../../UI/QuickBuy';
import { useQuickBuySetup } from '../../../UI/QuickBuy/hooks/useQuickBuySetup';
import { usePositionTokenBalance } from '../../../UI/QuickBuy/hooks/usePositionTokenBalance';
import type { QuickBuyTradeMode } from '../../../UI/QuickBuy/types';
import { EnsureAccessRestricted } from '../../../UI/Compliance/contexts/AccessRestrictedContext';
import { SocialFeedSurfaceProvider } from '../../../UI/SocialFeed/SocialFeedSurface';
import { useOpenPerpsOrder } from '../../../UI/SocialFeed/hooks/useOpenPerpsOrder';
import { chainNameToId } from '../../../UI/SocialFeed/utils/chainMapping';
import type { PerpDirection } from '../../../UI/SocialFeed/utils/perp';
import { useRequireSocialProfileOnboarding } from '../hooks/useRequireSocialProfileOnboarding';
import { useMyProfile } from '../MyProfileView/hooks';
import { navigateToSocialV1Profile } from '../navigation/navigateToSocialV1Profile';
import { useSocialTermsGate } from '../terms/useSocialTermsGate';
import {
  buildSocialTradeOgImageRequest,
  fetchPerpOgSeries,
  getEarliestTradeMs,
} from '../navigation/socialOgImageCards';
import { logSocialOgShare } from '../navigation/socialOgShareLog';
import { buildSocialPositionOpenGraph } from '../navigation/socialShareOpenGraph';
import { shareSocialTraderPosition } from '../navigation/socialTraderDeeplink';
import { useSocialShareInProgress } from '../navigation/useSocialShareInProgress';
import { SocialEvent, useSocialAnalytics } from '../analytics';
import { playSelection } from '../../../../util/haptics';
import {
  formatAbbreviatedUsd,
  formatTradeUnitPrice,
} from '../../../UI/SocialFeed/utils/formatters';
import { deriveMarketCapPerPrice } from '../../../UI/SocialFeed/utils/toSocialV1FeedItem';
import PositionSheetChart from './components/PositionSheetChart';
import PositionSheetChartControls, {
  type HeadlineValueMode,
} from './components/PositionSheetChartControls';
import PositionSheetFooter from './components/PositionSheetFooter';
import PositionSheetHeader from './components/PositionSheetHeader';
import PositionSheetPriceHeader from './components/PositionSheetPriceHeader';
import PositionSheetTabs, {
  SWIPE_THRESHOLD,
} from './components/PositionSheetTabs';
import PositionSheetTradeSummary from './components/PositionSheetTradeSummary';
import { useLivePosition } from './hooks/useLivePosition';
import { usePositionSheetData } from './hooks/usePositionSheetData';
import { useChartLineReveal } from './hooks/useChartLineReveal';
import { formatChartTimestamp, type ChartPeriod } from './utils/chartWindow';
import type { PositionDetailsSheetParams } from './PositionDetailsSheet.types';
import { PositionDetailsSheetSelectorsIDs } from './PositionDetailsSheet.testIds';

const addressesMatch = (
  left: string | null | undefined,
  right: string | null | undefined,
): boolean => {
  const normalizedLeft = left?.toLowerCase();
  const normalizedRight = right?.toLowerCase();
  return Boolean(
    normalizedLeft && normalizedRight && normalizedLeft === normalizedRight,
  );
};

/**
 * Social V1 position / trade details: the header, a self-drawing price line,
 * the trade summary, the post (when there is one) and the actions.
 */
const PositionDetailsSheet = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const sheetRef = useRef<BottomSheetRef>(null);
  const {
    positionId,
    position: positionParam,
    author,
    isClosed: isClosedParam,
    isSnapshotLive,
    orderSource,
    shareSource,
  } = useParams<PositionDetailsSheetParams>();

  const live = useLivePosition({
    positionId,
    snapshot: positionParam,
    isSnapshotLive,
  });
  const { position } = live;

  // `null` (unknown) is treated as online; only a confirmed `NONE` skips the
  // price fetch and the line draw.
  const networkTier = useNetworkTier();
  const isNetworkAvailable = networkTier !== 'NONE';

  // The caller's flag describes its snapshot; a newer copy carries its own.
  const data = usePositionSheetData(
    position,
    live.isRefreshed ? undefined : isClosedParam,
    { isNetworkAvailable },
  );
  const isChartLoading = data.isPricesLoading || live.isLoading;
  // One lookup per opened spot position. Perps and a confirmed offline tier
  // skip it. The query aborts when this sheet unmounts.
  const spotAssetId =
    data.isPerp || !position
      ? null
      : toFeedAssetId({
          chain: position.chain,
          tokenAddress: position.tokenAddress,
          tokenSymbol: position.tokenSymbol,
        });
  const { isMeme } = useIsMemeToken({
    assetId: spotAssetId,
    enabled: isNetworkAvailable && spotAssetId != null,
  });
  const reveal = useChartLineReveal({
    isChartReady: !isChartLoading,
    hasChartData: data.prices.length >= 2,
  });

  const { profile } = useMyProfile();
  const { ensureSocialProfileOnboarding } = useRequireSocialProfileOnboarding();
  const { ensureSocialTermsAccepted } = useSocialTermsGate();
  const isOwnPost =
    (Boolean(profile?.profileId) && author.id === profile?.profileId) ||
    addressesMatch(author.address, profile?.linkedAccountAddress);

  const [scrubPoint, setScrubPoint] = useState<TokenPrice | null>(null);
  const [headlineChoice, setHeadlineChoice] =
    useState<HeadlineValueMode | null>(null);
  const [headlinePositionId, setHeadlinePositionId] = useState(
    position?.positionId,
  );
  if (headlinePositionId !== position?.positionId) {
    setHeadlinePositionId(position?.positionId);
    setHeadlineChoice(null);
  }
  const [isTabsExpanded, setIsTabsExpanded] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [pinnedFooterHeight, setPinnedFooterHeight] = useState(0);
  const { height: frameHeight } = useSafeAreaFrame();
  const { top: topInset, bottom: bottomInset } = useSafeAreaInsets();
  // Matches the padding the design-system sheet adds under its content.
  const sheetBottomPadding =
    Platform.OS === 'ios' || Platform.OS === 'macos'
      ? bottomInset
      : bottomInset + 16;
  const maxScrollHeight = Math.max(
    0,
    frameHeight -
      topInset -
      sheetBottomPadding -
      headerHeight -
      (isTabsExpanded ? pinnedFooterHeight : 0),
  );

  const handleHeaderLayout = useCallback((event: LayoutChangeEvent) => {
    setHeaderHeight(Math.ceil(event.nativeEvent.layout.height));
  }, []);
  const handlePinnedFooterLayout = useCallback((event: LayoutChangeEvent) => {
    setPinnedFooterHeight(Math.ceil(event.nativeEvent.layout.height));
  }, []);

  // Scrolling up past the threshold opens the active tab. The sheet's own
  // pan still dismisses on a downward drag.
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (event.nativeEvent.contentOffset.y > SWIPE_THRESHOLD) {
        setIsTabsExpanded(true);
      }
    },
    [],
  );

  // iOS bounce: pulling the open sheet down past its top closes the tab.
  const handleScrollEndDrag = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (event.nativeEvent.contentOffset.y < -SWIPE_THRESHOLD * 2) {
        setIsTabsExpanded(false);
      }
    },
    [],
  );

  const closeThen = useCallback((next: () => void) => {
    if (sheetRef.current) {
      sheetRef.current.onCloseBottomSheet(next);
    } else {
      next();
    }
  }, []);

  const handleOpenAsset = useCallback(() => {
    if (data.isPerp) {
      if (!data.perpTradeSymbol) {
        return;
      }
      const symbol = data.perpTradeSymbol;
      void playSelection()?.catch(() => undefined);
      closeThen(() => {
        navigation.navigate(Routes.PERPS.ROOT, {
          screen: Routes.PERPS.MARKET_DETAILS,
          params: {
            market: {
              symbol,
              name: getPerpsDisplaySymbol(symbol),
            } as PerpsMarketData,
            source: 'trader_feed',
          },
        });
      });
      return;
    }

    if (!position?.tokenAddress) {
      return;
    }
    const caipChainId = chainNameToId(position.chain);
    if (!caipChainId) {
      return;
    }
    const { namespace, reference } = parseCaipChainId(caipChainId);
    const isEvm = namespace === 'eip155';
    const chainId = isEvm
      ? `0x${Number.parseInt(reference, 10).toString(16)}`
      : caipChainId;
    const address = isEvm
      ? position.tokenAddress
      : (toAssetId(position.tokenAddress, caipChainId) ??
        position.tokenAddress);
    let isNative = !isEvm && address.includes('/slip44:');
    if (isEvm) {
      try {
        // The zero address is how social records ETH and other native coins.
        // The asset page treats that as an ERC-20 unless this flag is set.
        isNative =
          formatAddressToAssetId(position.tokenAddress, caipChainId)?.includes(
            '/slip44:',
          ) ?? false;
      } catch {
        isNative = false;
      }
    }
    const { tokenSymbol } = position;
    const { assetName } = data;
    void playSelection()?.catch(() => undefined);
    closeThen(() => {
      navigation.navigate('Asset', {
        chainId,
        address,
        symbol: tokenSymbol,
        name: assetName,
        isNative,
      });
    });
  }, [closeThen, data, navigation, position]);

  const handleOpenTraderProfile = useCallback(() => {
    void playSelection()?.catch(() => undefined);
    closeThen(() => {
      navigateToSocialV1Profile(navigation, {
        traderId: author.id,
        traderName: author.username,
        traderAddress: author.address,
        traderAvatarUri: author.avatarUri ?? undefined,
        source: 'trader_feed',
        viewerProfileId: profile?.profileId ?? undefined,
        viewerAddress: profile?.linkedAccountAddress ?? undefined,
      });
    });
  }, [author, closeThen, navigation, profile]);

  const { trackInteraction: trackSocialPost } = useSocialAnalytics();
  const { isSharing, runShare } = useSocialShareInProgress();
  const handleSharePosition = useCallback(() => {
    const sharedPositionId = position?.positionId ?? positionId;
    if (!sharedPositionId || !shareSource) {
      return;
    }
    const sharedPosition = position;
    const buildOgImageRequest = sharedPosition
      ? async () => {
          const prices = data.isPerp
            ? await fetchPerpOgSeries(
                sharedPosition.tokenSymbol,
                getEarliestTradeMs(sharedPosition.trades),
                Date.now(),
              )
            : data.prices;
          logSocialOgShare('Building trade card on the position sheet', {
            positionId: sharedPositionId,
            isPerp: data.isPerp,
            isClosed: data.isClosed,
            priceSource: data.isPerp ? 'hyperliquid candles' : 'sheet chart',
            pricePoints: prices.length,
          });
          return buildSocialTradeOgImageRequest({
            traderId: author.id,
            positionId: sharedPositionId,
            username: author.username,
            avatarUrl: author.avatarUri,
            position: sharedPosition,
            market: data.symbol,
            marketIconUrl: sharedPosition.tokenImageUrl ?? data.tokenImageUrl,
            isPerp: data.isPerp,
            isClosed: data.isClosed,
            pnlUsd: data.pnlValue,
            pnlPct: data.pnlPercent,
            markPrice: data.currentPrice,
            prices,
          });
        }
      : undefined;
    runShare(() =>
      shareSocialTraderPosition(
        sharedPositionId,
        author.id,
        () => {
          trackSocialPost({
            interaction_type: SocialEvent.Interaction.POST_SHARED,
            screen_name: SocialEvent.Screen.SHARE_POSITION_SHEET,
            share_destination: SocialEvent.ShareDestination.EXTERNAL,
            source: shareSource,
          });
        },
        buildSocialPositionOpenGraph({
          traderName: author.username,
          assetSymbol: data.symbol,
        }),
        buildOgImageRequest,
      ),
    );
  }, [
    author,
    data.currentPrice,
    data.isClosed,
    data.isPerp,
    data.pnlPercent,
    data.pnlValue,
    data.prices,
    data.symbol,
    data.tokenImageUrl,
    position,
    positionId,
    runShare,
    shareSource,
    trackSocialPost,
  ]);

  // Quick Buy lives in this route, so a spot action hides the sheet but keeps
  // the route until Quick Buy closes. Popping it then lets the post-trade and
  // failure sheets, hosted at the app root, show above.
  const isHandingOffRef = useRef(false);
  const [isSheetDismissed, setIsSheetDismissed] = useState(false);
  const handleSheetClosed = useCallback(() => {
    if (isHandingOffRef.current) {
      setIsSheetDismissed(true);
      return;
    }
    navigation.goBack();
  }, [navigation]);

  const { openPerpsOrder, geoBlockSheet } = useOpenPerpsOrder({
    runNavigation: closeThen,
    source: orderSource,
  });

  const quickBuyTarget = useMemo(
    () =>
      position && !data.isPerp ? positionToQuickBuyTarget(position) : null,
    [position, data.isPerp],
  );
  const { destToken } = useQuickBuySetup(data.isClosed ? quickBuyTarget : null);
  const heldBalance = usePositionTokenBalance(
    data.isClosed ? quickBuyTarget : null,
    destToken,
  );
  const [quickBuyMode, setQuickBuyMode] = useState<QuickBuyTradeMode | null>(
    null,
  );
  const openQuickBuy = useCallback(
    (mode: QuickBuyTradeMode) => {
      isHandingOffRef.current = true;
      closeThen(() => setQuickBuyMode(mode));
    },
    [closeThen],
  );

  const handlePerpsOrder = useCallback(
    (direction: PerpDirection, leverage?: number) => {
      if (!data.perpTradeSymbol) return;
      openPerpsOrder({ direction, asset: data.perpTradeSymbol, leverage });
    },
    [data.perpTradeSymbol, openPerpsOrder],
  );

  const handleCopyTrade = useCallback(() => {
    if (!ensureSocialTermsAccepted() || !ensureSocialProfileOnboarding()) {
      return;
    }
    if (data.isPerp) {
      handlePerpsOrder(data.perpDirection ?? 'long', data.leverage);
      return;
    }
    openQuickBuy('buy');
  }, [
    data.isPerp,
    data.perpDirection,
    data.leverage,
    ensureSocialProfileOnboarding,
    ensureSocialTermsAccepted,
    handlePerpsOrder,
    openQuickBuy,
  ]);

  const fillMarketCapPerPrice =
    !data.isPerp && position ? deriveMarketCapPerPrice(position) : null;
  const cardQuotesMarketCap = fillMarketCapPerPrice != null;
  const showMarketCapToggle =
    !data.isPerp && ((data.marketCap ?? 0) > 0 || cardQuotesMarketCap);
  // Price until the meme check returns. A meme coin then opens on market cap.
  // A choice the user already made stays put.
  const headlineMode: HeadlineValueMode =
    headlineChoice ?? (isMeme && showMarketCapToggle ? 'marketCap' : 'price');
  const headlineIsMarketCap =
    showMarketCapToggle && headlineMode === 'marketCap';
  const quotedMarketCap =
    (data.marketCap ?? 0) > 0 ? data.marketCap : undefined;
  const marketCapPerPrice =
    quotedMarketCap != null && data.currentPrice
      ? quotedMarketCap / data.currentPrice
      : (fillMarketCapPerPrice ?? undefined);
  const firstPrice = data.prices[0]?.[1];
  const headerValue = scrubPoint
    ? headlineIsMarketCap && marketCapPerPrice
      ? scrubPoint[1] * marketCapPerPrice
      : scrubPoint[1]
    : headlineIsMarketCap
      ? (quotedMarketCap ??
        (data.currentPrice != null && marketCapPerPrice != null
          ? data.currentPrice * marketCapPerPrice
          : undefined))
      : data.currentPrice;
  const scrubChangePercent =
    firstPrice && scrubPoint
      ? ((scrubPoint[1] - firstPrice) / firstPrice) * 100
      : undefined;
  const headerChange = scrubPoint
    ? scrubChangePercent
    : data.dailyChangePercent;
  const headerLabel =
    headerValue === undefined
      ? undefined
      : headlineIsMarketCap
        ? formatAbbreviatedUsd(headerValue)
        : formatTradeUnitPrice(headerValue);
  const { setChartPeriod } = data;
  const handlePeriodChange = useCallback(
    (period: ChartPeriod) => {
      setScrubPoint(null);
      setChartPeriod(period);
    },
    [setChartPeriod],
  );
  const headerCaption = scrubPoint
    ? formatChartTimestamp(Number(scrubPoint[0]))
    : strings('social_leaderboard.position_sheet.today');

  // Copy trade repeats the viewer's own position. Closed markets still offer
  // a fresh Long, Short, Buy, or Sell.
  const footer =
    isOwnPost && !data.isClosed ? null : (
      <PositionSheetFooter
        isPerp={data.isPerp}
        isClosed={data.isClosed}
        canSell={Boolean(heldBalance)}
        onCopyTrade={handleCopyTrade}
        onPerpsOrder={handlePerpsOrder}
        onSpotTrade={openQuickBuy}
      />
    );

  const details = (
    <View>
      <Box twClassName="px-4 py-3" gap={2}>
        <PositionSheetTradeSummary
          title={data.summaryTitle}
          tagLabel={data.summaryTagLabel}
          direction={data.perpDirection}
          isClosed={data.isClosed}
          subtitle={data.summarySubtitle}
          pnlPercentLabel={data.pnlPercentLabel}
          pnlValueLabel={data.pnlValueLabel}
          isPnlPositive={data.isPnlPositive}
        />
      </Box>
      <PositionSheetTabs
        position={position}
        author={author}
        isExpanded={isTabsExpanded}
        onExpandedChange={setIsTabsExpanded}
      />
      {isTabsExpanded ? null : footer}
    </View>
  );

  return (
    <SocialFeedSurfaceProvider showMockedFields>
      {isSheetDismissed ? null : (
        <BottomSheet
          ref={sheetRef}
          isInteractable
          goBack={handleSheetClosed}
          testID={PositionDetailsSheetSelectorsIDs.CONTAINER}
        >
          <View onLayout={handleHeaderLayout}>
            <PositionSheetHeader
              author={author}
              isOwnPost={isOwnPost}
              onPressTrader={handleOpenTraderProfile}
              onShare={shareSource ? handleSharePosition : undefined}
              isSharing={isSharing}
            />
          </View>
          {/* Bounded so content past the screen scrolls instead of being clipped. */}
          <ScrollView
            style={
              headerHeight > 0 ? { maxHeight: maxScrollHeight } : undefined
            }
            scrollEnabled
            nestedScrollEnabled
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            onScrollEndDrag={handleScrollEndDrag}
            testID={PositionDetailsSheetSelectorsIDs.SCROLL}
          >
            <PositionSheetPriceHeader
              assetName={data.assetName}
              isPerp={data.isPerp}
              leverage={data.leverage}
              valueLabel={headerLabel}
              isMarketCapMode={headlineIsMarketCap}
              changePercent={headerChange}
              changeCaption={headerCaption}
              position={position}
              onPressAsset={handleOpenAsset}
            />
            <PositionSheetChartControls
              period={data.chartPeriod}
              onPeriodChange={handlePeriodChange}
              showValueToggle={showMarketCapToggle}
              valueMode={headlineMode}
              onValueModeChange={setHeadlineChoice}
            />
            <PositionSheetChart
              prices={data.prices}
              isLoading={isChartLoading}
              isTrendPositive={data.isTrendPositive}
              markers={data.markers}
              timeAxisLabels={data.timeAxisLabels}
              lineProgress={reveal.lineProgress}
              overlayStyle={reveal.overlayStyle}
              onScrub={setScrubPoint}
            />
            <View testID={PositionDetailsSheetSelectorsIDs.DETAILS}>
              {details}
            </View>
          </ScrollView>
          {isTabsExpanded ? (
            <View onLayout={handlePinnedFooterLayout}>{footer}</View>
          ) : null}
        </BottomSheet>
      )}

      {!data.isPerp && position ? (
        <TraderPositionQuickBuy
          isVisible={quickBuyMode !== null}
          position={position}
          onClose={navigation.goBack}
          traderAddress={author.address}
          marketCap={data.marketCap}
          source={orderSource ?? 'trader_feed'}
          originalEntryPoint="trader_feed"
          isTraderPositionClosed={data.isClosed}
          postTradeShare
          initialTradeMode={quickBuyMode ?? undefined}
        />
      ) : null}
      {geoBlockSheet}
    </SocialFeedSurfaceProvider>
  );
};

const PositionDetailsSheetWithCompliance = () => (
  <EnsureAccessRestricted>
    <PositionDetailsSheet />
  </EnsureAccessRestricted>
);

export default PositionDetailsSheetWithCompliance;
