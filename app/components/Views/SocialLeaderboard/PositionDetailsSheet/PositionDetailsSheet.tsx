import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import {
  BottomSheet,
  Box,
  Text,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { useParams } from '../../../../util/navigation/navUtils';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import type { TokenPrice } from '../../../hooks/useTokenHistoricalPrices';
import TraderPositionQuickBuy, {
  positionToQuickBuyTarget,
} from '../../../UI/QuickBuy';
import { useQuickBuySetup } from '../../../UI/QuickBuy/hooks/useQuickBuySetup';
import { usePositionTokenBalance } from '../../../UI/QuickBuy/hooks/usePositionTokenBalance';
import type { QuickBuyTradeMode } from '../../../UI/QuickBuy/types';
import { EnsureAccessRestricted } from '../../../UI/Compliance/contexts/AccessRestrictedContext';
import { SocialFeedSurfaceProvider } from '../../../UI/SocialFeed/SocialFeedSurface';
import { useOpenPerpsOrder } from '../../../UI/SocialFeed/hooks/useOpenPerpsOrder';
import type { PerpDirection } from '../../../UI/SocialFeed/utils/perp';
import { useMyProfile } from '../MyProfileView/hooks';
import { useTraderPosition } from '../TraderPositionView/hooks/useTraderPosition';
import PositionSheetChart from './components/PositionSheetChart';
import PositionSheetFooter from './components/PositionSheetFooter';
import PositionSheetHeader from './components/PositionSheetHeader';
import PositionSheetPriceHeader from './components/PositionSheetPriceHeader';
import PositionSheetTradeSummary from './components/PositionSheetTradeSummary';
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
): boolean =>
  Boolean(left && right && left.toLowerCase() === right.toLowerCase());

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
    comment,
    isClosed: isClosedParam,
  } = useParams<PositionDetailsSheetParams>();

  const fetched = useTraderPosition(positionParam ? undefined : positionId);
  const position = positionParam ?? fetched.position;

  // `null` (unknown) is treated as online; only a confirmed `NONE` skips the
  // price fetch and the line draw.
  const networkTier = useNetworkTier();
  const isNetworkAvailable = networkTier !== 'NONE';

  const data = usePositionSheetData(position, isClosedParam, {
    isNetworkAvailable,
  });
  const isChartLoading =
    data.isPricesLoading || (!position && fetched.isLoading);
  const reveal = useTwoStepSheetReveal({
    isChartReady: !isChartLoading,
    hasChartData: data.prices.length >= 2,
  });

  const { profile } = useMyProfile();
  const isOwnPost =
    (Boolean(profile?.profileId) && author.id === profile?.profileId) ||
    addressesMatch(author.address, profile?.linkedAccountAddress);

  const [scrubPoint, setScrubPoint] = useState<TokenPrice | null>(null);

  const closeThen = useCallback((next: () => void) => {
    if (sheetRef.current) {
      sheetRef.current.onCloseBottomSheet(next);
    } else {
      next();
    }
  }, []);

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

  const handlePerpsOrder = useCallback(
    (direction: PerpDirection, leverage?: number) => {
      if (!data.perpTradeSymbol) return;
      openPerpsOrder({ direction, asset: data.perpTradeSymbol, leverage });
    },
    [data.perpTradeSymbol, openPerpsOrder],
  );

  const handleCopyTrade = useCallback(() => {
    if (data.isPerp) {
      handlePerpsOrder(data.perpDirection ?? 'long', data.leverage);
      return;
    }
    setQuickBuyMode('buy');
  }, [data.isPerp, data.perpDirection, data.leverage, handlePerpsOrder]);

  const handleSummaryPress = useCallback(() => {
    closeThen(() => {
      if (position) {
        navigation.navigate(Routes.SOCIAL.POSITION, {
          traderId: author.id,
          tokenSymbol: position.tokenSymbol,
          position,
          positionId,
          traderName: author.username,
          traderImageUrl: author.avatarUri ?? undefined,
          traderAddress: author.address,
          source: 'trader_feed',
          originalEntryPoint: 'trader_feed',
          isClosed: data.isClosed,
          isSocialV1: true,
        });
        return;
      }
      navigation.navigate(Routes.SOCIAL.POSITION, {
        positionId,
        traderId: author.id,
        traderAddress: author.address,
        source: 'trader_feed',
        originalEntryPoint: 'trader_feed',
        isSocialV1: true,
      });
    });
  }, [closeThen, navigation, position, positionId, author, data.isClosed]);

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

  const details = (
    <>
      <Box twClassName="px-4 py-3" gap={2}>
        <PositionSheetTradeSummary
          position={position}
          title={data.summaryTitle}
          subtitle={data.summarySubtitle}
          pnlPercentLabel={data.pnlPercentLabel}
          pnlValueLabel={data.pnlValueLabel}
          isPnlPositive={data.isPnlPositive}
          onPress={handleSummaryPress}
        />
        {comment ? (
          <Text
            variant={TextVariant.BodySm}
            testID={PositionDetailsSheetSelectorsIDs.COMMENT}
          >
            {comment}
          </Text>
        ) : null}
      </Box>
      <PositionSheetFooter
        isPerp={data.isPerp}
        isClosed={data.isClosed}
        canSell={Boolean(heldBalance)}
        onCopyTrade={handleCopyTrade}
        onPerpsOrder={handlePerpsOrder}
        onSpotTrade={setQuickBuyMode}
      />
    </>
  );

  return (
    <SocialFeedSurfaceProvider showMockedFields>
      <BottomSheet
        ref={sheetRef}
        isInteractable
        goBack={navigation.goBack}
        testID={PositionDetailsSheetSelectorsIDs.CONTAINER}
      >
        <PositionSheetHeader
          author={author}
          position={position}
          isOwnPost={isOwnPost}
        />
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
      </BottomSheet>

      {!data.isPerp && position ? (
        <TraderPositionQuickBuy
          isVisible={quickBuyMode !== null}
          position={position}
          onClose={() => setQuickBuyMode(null)}
          traderAddress={author.address}
          marketCap={data.marketCap}
          source="trader_feed"
          originalEntryPoint="trader_feed"
          isTraderPositionClosed={data.isClosed}
          postSwapShare
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
