import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Box } from '@metamask/design-system-react-native';
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
import PositionSheetContainer, {
  type PositionSheetContainerRef,
} from './components/PositionSheetContainer';
import PositionSheetFooter from './components/PositionSheetFooter';
import PositionSheetHeader from './components/PositionSheetHeader';
import PositionSheetPriceHeader from './components/PositionSheetPriceHeader';
import PositionSheetTabs from './components/PositionSheetTabs';
import PositionSheetTradeSummary from './components/PositionSheetTradeSummary';
import { useLivePosition } from './hooks/useLivePosition';
import { usePositionSheetData } from './hooks/usePositionSheetData';
import { useChartLineReveal } from './hooks/useChartLineReveal';
import { useHeldWhileDragging } from './hooks/useHeldWhileDragging';
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
  const sheetRef = useRef<PositionSheetContainerRef>(null);
  const {
    positionId,
    position: positionParam,
    author,
    isClosed: isClosedParam,
    isSnapshotLive,
    orderSource,
  } = useParams<PositionDetailsSheetParams>();

  const live = useLivePosition({
    positionId,
    snapshot: positionParam,
    isSnapshotLive,
  });
  // `null` (unknown) is treated as online; only a confirmed `NONE` skips the
  // price fetch and the line draw.
  const networkTier = useNetworkTier();
  const isNetworkAvailable = networkTier !== 'NONE';

  // The caller's flag describes its snapshot; a newer copy carries its own.
  const liveData = usePositionSheetData(
    live.position,
    live.isRefreshed ? undefined : isClosedParam,
    { isNetworkAvailable },
  );
  const sheetState = useHeldWhileDragging({
    position: live.position,
    data: liveData,
    isChartLoading: liveData.isPricesLoading || live.isLoading,
  });
  const { position, data, isChartLoading } = sheetState.value;
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isChartFrameReady, setIsChartFrameReady] = useState(false);
  const handleChartFrameReady = useCallback(() => {
    setIsChartFrameReady(true);
  }, []);
  const handleSheetOpened = useCallback(() => {
    setIsSheetOpen(true);
  }, []);
  const reveal = useChartLineReveal({
    isChartReady: !isChartLoading && isChartFrameReady,
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
  const closeThen = useCallback((next: () => void) => {
    if (sheetRef.current) {
      sheetRef.current.close(next);
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
  const headlineMode: HeadlineValueMode =
    headlineChoice ?? (cardQuotesMarketCap ? 'marketCap' : 'price');
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

  return (
    <SocialFeedSurfaceProvider showMockedFields>
      {isSheetDismissed ? null : (
        <PositionSheetContainer
          ref={sheetRef}
          onClosed={handleSheetClosed}
          onOpened={handleSheetOpened}
          onDragStart={sheetState.onDragStart}
          onDragEnd={sheetState.onDragEnd}
          testID={PositionDetailsSheetSelectorsIDs.CONTAINER}
          header={
            <PositionSheetHeader
              author={author}
              isOwnPost={isOwnPost}
              onPressTrader={handleOpenTraderProfile}
            />
          }
          footer={footer}
        >
          <PositionSheetTabs position={position} author={author}>
            <PositionSheetPriceHeader
              assetName={data.assetName}
              isPerp={data.isPerp}
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
              onFrameReady={handleChartFrameReady}
              isSheetOpen={isSheetOpen}
            />
            <View testID={PositionDetailsSheetSelectorsIDs.DETAILS}>
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
            </View>
          </PositionSheetTabs>
        </PositionSheetContainer>
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
