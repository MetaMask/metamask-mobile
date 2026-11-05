import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
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
import PositionSheetChart from './components/PositionSheetChart';
import PositionSheetFooter from './components/PositionSheetFooter';
import PositionSheetHeader from './components/PositionSheetHeader';
import PositionSheetPriceHeader from './components/PositionSheetPriceHeader';
import PositionSheetTabs, {
  SWIPE_THRESHOLD,
} from './components/PositionSheetTabs';
import PositionSheetTradeSummary from './components/PositionSheetTradeSummary';
import { useLivePosition } from './hooks/useLivePosition';
import { usePositionSheetData } from './hooks/usePositionSheetData';
import { useTwoStepSheetReveal } from './hooks/useTwoStepSheetReveal';
import { formatChartTimestamp } from './utils/chartWindow';
import type { PositionDetailsSheetParams } from './PositionDetailsSheet.types';
import { PositionDetailsSheetSelectorsIDs } from './PositionDetailsSheet.testIds';

const styles = StyleSheet.create({
  // Measured at its natural height while the clipping parent animates open.
  detailsMeasure: { position: 'absolute', top: 0, left: 0, right: 0 },
});

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
 * Social V1 position / trade details. Opens in two steps: the header and the
 * self-drawing price line first, then the sheet grows to show the trade
 * summary, the post (when there is one) and the actions.
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
  const reveal = useTwoStepSheetReveal({
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
  const [isTabsExpanded, setIsTabsExpanded] = useState(false);

  // Upward-only so a downward drag still dismisses the sheet. Collapsed, the
  // footer sits right under the tab bar; scrolling up opens the active tab.
  const expandGesture = useMemo(
    () =>
      Gesture.Pan()
        .withTestId(PositionDetailsSheetSelectorsIDs.DETAILS_EXPAND_GESTURE)
        .runOnJS(true)
        .enabled(!isTabsExpanded)
        .activeOffsetY(-6)
        .failOffsetY(6)
        .onEnd((event) => {
          if (event.translationY < -SWIPE_THRESHOLD) setIsTabsExpanded(true);
        }),
    [isTabsExpanded],
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

  const firstPrice = data.prices[0]?.[1];
  const headerValue = scrubPoint ? scrubPoint[1] : data.currentPrice;
  const scrubChangePercent =
    firstPrice && scrubPoint
      ? ((scrubPoint[1] - firstPrice) / firstPrice) * 100
      : undefined;
  const headerChange = scrubPoint
    ? scrubChangePercent
    : data.dailyChangePercent;
  const headerCaption = scrubPoint
    ? formatChartTimestamp(Number(scrubPoint[0]))
    : strings('social_leaderboard.position_sheet.today');

  const footer = (
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
    <GestureDetector gesture={expandGesture}>
      <View>
        <Box twClassName="px-4 py-3" gap={2}>
          <PositionSheetTradeSummary
            position={position}
            title={data.summaryTitle}
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
    </GestureDetector>
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
          <PositionSheetHeader
            author={author}
            isOwnPost={isOwnPost}
            onPressTrader={handleOpenTraderProfile}
          />
          {/* Collapsed, everything fits and drags move the sheet instead. */}
          <ScrollView
            scrollEnabled={isTabsExpanded}
            showsVerticalScrollIndicator={false}
            onScrollEndDrag={handleScrollEndDrag}
            testID={PositionDetailsSheetSelectorsIDs.SCROLL}
          >
            <PositionSheetPriceHeader
              assetName={data.assetName}
              isPerp={data.isPerp}
              leverage={data.leverage}
              valueLabel={
                headerValue !== undefined
                  ? data.formatValue(headerValue)
                  : undefined
              }
              isMarketCapMode={data.isMarketCapMode}
              changePercent={headerChange}
              changeCaption={headerCaption}
              position={position}
              onPressAsset={handleOpenAsset}
            />
            <PositionSheetChart
              prices={data.prices}
              isLoading={isChartLoading}
              isTrendPositive={data.isTrendPositive}
              markers={data.markers}
              levels={data.levels}
              timeAxisLabels={data.timeAxisLabels}
              lineProgress={reveal.lineProgress}
              overlayStyle={reveal.overlayStyle}
              onScrub={setScrubPoint}
            />
            {reveal.isAnimated ? (
              <Animated.View
                style={reveal.detailsContainerStyle}
                testID={PositionDetailsSheetSelectorsIDs.DETAILS}
              >
                <Animated.View
                  style={[styles.detailsMeasure, reveal.detailsContentStyle]}
                  onLayout={reveal.onDetailsLayout}
                >
                  {details}
                </Animated.View>
              </Animated.View>
            ) : (
              <View testID={PositionDetailsSheetSelectorsIDs.DETAILS}>
                {details}
              </View>
            )}
          </ScrollView>
          {isTabsExpanded ? footer : null}
        </BottomSheet>
      )}

      {!data.isPerp && position ? (
        <TraderPositionQuickBuy
          isVisible={quickBuyMode !== null}
          position={position}
          onClose={navigation.goBack}
          traderAddress={author.address}
          marketCap={data.marketCap}
          source="trader_feed"
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
