import React, { useCallback, useState } from 'react';
import { Image, TouchableOpacity } from 'react-native';
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
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonVariant,
  AvatarBase,
  AvatarBaseSize,
  AvatarToken,
  AvatarTokenSize,
} from '@metamask/design-system-react-native';
import type { Trade } from '@metamask/social-controllers';
import { strings } from '../../../../../locales/i18n';
import { TraderPositionViewSelectorsIDs } from './TraderPositionView.testIds';
import QuickBuyBottomSheet from './components/QuickBuyBottomSheet';
import { formatUsd, formatPercent, formatTradeDate } from '../utils/formatters';
import {
  formatSignedUsd,
  formatCompactUsd,
} from '../../../UI/Rewards/utils/formatUtils';
import PriceChart from '../../../UI/AssetOverview/PriceChart';
import { PriceChartProvider } from '../../../UI/AssetOverview/PriceChart/PriceChart.context';
import { useTraderPositionData } from './useTraderPositionData';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface TimePeriodButtonProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

const TimePeriodButton: React.FC<TimePeriodButtonProps> = ({
  label,
  isActive,
  onPress,
}) => (
  <TouchableOpacity onPress={onPress}>
    <Box
      twClassName={`flex-1 items-center justify-center px-2 py-1 rounded ${
        isActive ? 'bg-muted' : ''
      }`}
    >
      <Text
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={isActive ? TextColor.TextDefault : TextColor.TextAlternative}
      >
        {label}
      </Text>
    </Box>
  </TouchableOpacity>
);

interface TradeRowProps {
  trade: Trade;
  traderName: string;
  traderImageUrl?: string;
}

const TradeRow: React.FC<TradeRowProps> = ({
  trade,
  traderName,
  traderImageUrl,
}) => {
  const tw = useTailwind();
  const isEntry = trade.intent === 'enter';
  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="px-4 py-3"
      testID={`trade-row-${trade.transactionHash}`}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={4}
        twClassName="flex-1 min-w-0 mr-3"
      >
        {traderImageUrl ? (
          <Image
            source={{ uri: traderImageUrl }}
            style={tw.style('w-[32px] h-[32px] rounded-full bg-muted')}
            resizeMode="cover"
          />
        ) : (
          <AvatarBase
            size={AvatarBaseSize.Md}
            fallbackText={traderName.charAt(0).toUpperCase()}
          />
        )}
        <Box twClassName="flex-1 min-w-0">
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            numberOfLines={1}
          >
            {isEntry
              ? strings('social_leaderboard.trader_position.bought', {
                  name: traderName,
                })
              : strings('social_leaderboard.trader_position.sold', {
                  name: traderName,
                })}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            numberOfLines={1}
          >
            {formatTradeDate(trade.timestamp)}
          </Text>
        </Box>
      </Box>

      <Box alignItems={BoxAlignItems.End}>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          twClassName={isEntry ? 'text-success-default' : 'text-error-default'}
        >
          {formatUsd(
            isEntry ? Math.abs(trade.usdCost) : -Math.abs(trade.usdCost),
          )}
        </Text>
      </Box>
    </Box>
  );
};

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

const TraderPositionView = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'TraderPositionView'>>();
  const tw = useTailwind();

  const {
    traderName,
    traderImageUrl,
    tokenSymbol,
    position: positionParam,
  } = route.params;

  const [isQuickBuyVisible, setIsQuickBuyVisible] = useState(false);

  const {
    symbol,
    tokenImageUrl,
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
  } = useTraderPositionData(positionParam, tokenSymbol);

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleBuyPress = useCallback(() => {
    setIsQuickBuyVisible(true);
  }, []);

  const handleQuickBuyClose = useCallback(() => {
    setIsQuickBuyVisible(false);
  }, []);

  const handleChartIndexChange = useCallback((_index: number) => {
    // Future: update displayed price on scrub
  }, []);

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      testID={TraderPositionViewSelectorsIDs.CONTAINER}
    >
      {/* Header */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="px-2 py-2"
      >
        <Box twClassName="w-10" />
        <Text
          variant={TextVariant.HeadingSm}
          fontWeight={FontWeight.Bold}
          color={TextColor.TextDefault}
          numberOfLines={1}
        >
          {traderName}
        </Text>
        <Box twClassName="w-10 items-end">
          <ButtonIcon
            iconName={IconName.Close}
            size={ButtonIconSize.Md}
            onPress={handleClose}
            testID={TraderPositionViewSelectorsIDs.CLOSE_BUTTON}
          />
        </Box>
      </Box>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={tw.style('pb-6')}
      >
        {/* Token Info Row */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="px-4 py-3"
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={4}
            twClassName="flex-1 min-w-0 mr-3"
          >
            <AvatarToken
              name={symbol}
              src={tokenImageUrl ? { uri: tokenImageUrl } : undefined}
              size={AvatarTokenSize.Lg}
            />
            <Box twClassName="flex-1 min-w-0">
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
                numberOfLines={1}
              >
                {symbol}
              </Text>
              {pricePercentChange != null ? (
                <Text
                  variant={TextVariant.BodySm}
                  twClassName={
                    pricePercentChange >= 0
                      ? 'text-success-default'
                      : 'text-error-default'
                  }
                  numberOfLines={1}
                >
                  {`${pricePercentChange >= 0 ? '+' : ''}${pricePercentChange.toFixed(1)}% `}
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                  >
                    {activeTimePeriod}
                  </Text>
                </Text>
              ) : (
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {'\u2014'}
                </Text>
              )}
            </Box>
          </Box>

          <Box alignItems={BoxAlignItems.End}>
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
            >
              {marketCap != null ? formatCompactUsd(marketCap) : '\u2014'}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {strings('social_leaderboard.trader_position.market_cap')}
            </Text>
          </Box>
        </Box>

        {/* Price Chart */}
        <PriceChartProvider>
          <Box twClassName="mx-4 my-3">
            <PriceChart
              prices={historicalPrices}
              priceDiff={priceDiff}
              isLoading={isPricesLoading}
              onChartIndexChange={handleChartIndexChange}
            />
          </Box>
        </PriceChartProvider>

        {/* Timeline Selector */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="px-4 pb-3"
        >
          {timePeriods.map((period) => (
            <TimePeriodButton
              key={period}
              label={period}
              isActive={activeTimePeriod === period}
              onPress={() => setActiveTimePeriod(period)}
            />
          ))}
        </Box>

        {/* Position Card */}
        <Box twClassName="mx-4 p-4 bg-muted rounded-2xl">
          <Box
            flexDirection={BoxFlexDirection.Row}
            justifyContent={BoxJustifyContent.Between}
            alignItems={BoxAlignItems.Center}
          >
            {isClosed ? (
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
              >
                {strings('social_leaderboard.trader_position.closed_position')}
              </Text>
            ) : (
              <Box>
                <Text
                  variant={TextVariant.HeadingMd}
                  fontWeight={FontWeight.Bold}
                  color={TextColor.TextDefault}
                >
                  {formatUsd(positionValue)}
                </Text>
                <Text
                  variant={TextVariant.BodySm}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextDefault}
                >
                  {strings('social_leaderboard.trader_position.position')}
                </Text>
              </Box>
            )}
            <Box alignItems={BoxAlignItems.End}>
              <Text
                variant={TextVariant.HeadingMd}
                fontWeight={FontWeight.Bold}
                twClassName={
                  isPnlPositive ? 'text-success-default' : 'text-error-default'
                }
              >
                {pnlValue != null
                  ? formatSignedUsd(String(pnlValue))
                  : '\u2014'}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
              >
                {formatPercent(pnlPercent)}
              </Text>
            </Box>
          </Box>
        </Box>

        {/* Trades Tab Header */}
        <Box twClassName="px-4 mt-5">
          <Box twClassName="self-start pb-2 border-b-2 border-white">
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Bold}
              color={TextColor.TextDefault}
            >
              {strings('social_leaderboard.trader_position.trades')}
            </Text>
          </Box>
          <Box twClassName="h-px bg-muted -mt-0.5" />
        </Box>

        {/* Trade History */}
        {trades.length > 0 ? (
          trades.map((trade) => (
            <TradeRow
              key={trade.transactionHash}
              trade={trade}
              traderName={traderName}
              traderImageUrl={traderImageUrl}
            />
          ))
        ) : (
          <Box twClassName="px-4 py-6 items-center">
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {strings('social_leaderboard.trader_position.no_trades')}
            </Text>
          </Box>
        )}
      </ScrollView>

      {/* Buy Button — pinned at bottom */}
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

      {/* Quick Buy Bottom Sheet */}
      <QuickBuyBottomSheet
        isVisible={isQuickBuyVisible}
        position={positionParam ?? null}
        onClose={handleQuickBuyClose}
      />
    </SafeAreaView>
  );
};

export default TraderPositionView;
